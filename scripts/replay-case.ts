// Replays one real abandonment case from data/cases.csv on testnet, on a fast clock, end to end.
//   npx tsx scripts/replay-case.ts [IMO]        (default: SELIN, IMO 9033220, 2 seafarers, 3 months owed)
// The vessel, crew count and months owed come from the ITF list. The crew accounts are stand-ins and the
// wage is an assumption (the list does not publish wages); both are labelled on chain and in data/runs.json.
// The owner locks the reserve and then pays nothing, as the real owner stopped paying. We wait until as
// many ship days of wages are unpaid as the real crew were owed, declare abandonment, release each
// guarantee, and compare what the crew receive with what they were owed.
import { KeyPair } from "near-api-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { account, call, exists, saveKey, view, milli, ONE_YOCTO, readDeployment, explorerTx, refusal } from "./lib/near.ts";

const d = readDeployment();
const root = account(d.root);
const trust = account(d.trust);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const T = 1_000_000n;
const SECS_PER_DAY = 10n;
const DAILY_WAGE = 13n * T; // assumption: about 400 tUSD a month, labelled
const ALLOWANCE = 50n * T;

const imo = process.argv[2] ?? "9033220";
const rows = readFileSync("data/cases.csv", "utf8").trim().split("\n");
const head = rows[0].split(",");
const parse = (line: string) => { const out: string[] = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
const rec = rows.slice(1).map(parse).map((c) => Object.fromEntries(head.map((h, i) => [h, c[i]]))).find((r) => r.imo === imo);
if (!rec) throw new Error(`IMO ${imo} not in data/cases.csv`);
const crewN = Math.min(Number(rec.seafarers), 3);
const owedDays = BigInt(Number(rec.months_owed) * 30);
const slug = rec.vessel.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);

const runs: any = existsSync("data/runs.json") ? JSON.parse(readFileSync("data/runs.json", "utf8")) : {};
const prev = runs.case_replay?.imo === imo ? runs.case_replay : null;
const out: any = (runs.case_replay = prev ?? { vessel: rec.vessel, imo: rec.imo, port: rec.port, country: rec.country, months_owed: Number(rec.months_owed), seafarers_listed: Number(rec.seafarers), crew_replayed: crewN, source_url: rec.source_url, retrieved: rec.retrieved, assumptions: { daily_wage_tusd: 13, secs_per_ship_day: 10, crew_accounts: "stand-ins" }, tx: {} as Record<string, string> });
const save = () => writeFileSync("data/runs.json", JSON.stringify(runs, null, 2) + "\n");
const tx = (k: string, h: string) => { out.tx[k] = h; console.log(k, explorerTx(h)); save(); };

async function ensure(label: string, near: number) {
  const id = `${label}.${d.root}`;
  if (await exists(id)) return account(id);
  const kp = KeyPair.fromRandom("ed25519");
  await root.createSubAccount({ accountOrPrefix: id, publicKey: kp.getPublicKey(), nearToTransfer: milli(near) } as never);
  saveKey(id, kp);
  return account(id);
}

async function main() {
  console.log(`Replaying ${rec!.vessel} (IMO ${rec!.imo}), ${rec!.port}, ${rec!.country}: ${rec!.seafarers} seafarers, ${rec!.months_owed} months owed (ITF, retrieved ${rec!.retrieved})`);
  const owner = await ensure(`${slug}-owner`, 0.4);
  const crew = [] as ReturnType<typeof account>[];
  for (let i = 0; i < crewN; i++) crew.push(await ensure(`${slug}-crew${i + 1}`, 0.2));
  const SEA = `Replay of ITF case ${rec!.vessel} IMO ${rec!.imo}. Wage assumed 13 tUSD per day; the list does not publish wages.`;
  const SEA_HASH = createHash("sha256").update(SEA).digest("hex");

  const berths: string[] = [];
  for (let i = 0; i < crewN; i++) {
    const name = `${slug}-${i + 1}`;
    const id = `${name}.${d.registrar}`;
    if (!(await exists(id))) {
      const r = await call(trust, d.registry, "rent_sub_account_paid", { tla_id: d.registrar, name, owner_account: crew[i].accountId, payout_account: crew[i].accountId, order_id: `replay-${name}` }, { deposit: milli(0.1), gasT: 200 });
      if (!r.ok) throw new Error(`mint ${id}: ${r.failure}`);
      tx(`mint_${name}`, r.hash);
      await sleep(2500);
    }
    berths.push(id);
  }
  for (const who of [owner, ...crew]) await call(who, d.tusd, "storage_deposit", { account_id: who.accountId, registration_only: true }, { deposit: milli(0.00125) });
  for (const b of berths) await call(owner, d.tusd, "storage_deposit", { account_id: b, registration_only: true }, { deposit: milli(0.00125) });
  tx("faucet", (await call(owner, d.tusd, "faucet", {})).hash);

  let shipId: string = out.ship_id ?? "";
  if (!shipId) {
  const cs = await call(owner, d.portage, "create_ship", { name: `${rec!.vessel} replay (ITF case)`, imo: `IMO ${rec!.imo}`, token: d.tusd, secs_per_day: SECS_PER_DAY.toString(), reserve_months: 4, grace_days: "14", repatriation_allowance: ALLOWANCE.toString() }, { deposit: milli(0.05) });
  if (!cs.ok) throw new Error(`create_ship: ${cs.failure}`);
  shipId = String(cs.value); out.ship_id = shipId; tx("create_ship", cs.hash);
  for (const b of berths) tx(`open_${b.split(".")[0]}`, (await call(owner, d.portage, "open_berth", { ship_id: shipId, berth: b, daily_wage: DAILY_WAGE.toString(), contract_days: "270", sea_hash: SEA_HASH }, { deposit: milli(0.02) })).hash);
  }

  // The owner locks exactly the reserve and nothing more: no wages will be paid.
  let need = 0n; for (const b of berths) need += BigInt((await view<any>(d.portage, "get_berth", { berth: b })).reserve_needed);
  const sh = await view<any>(d.portage, "get_ship", { ship_id: shipId });
  const missing = need - BigInt(sh.reserved) - BigInt(sh.unreserved);
  if (missing > 0n) {
    const f = await call(owner, d.tusd, "ft_transfer_call", { receiver_id: d.portage, amount: missing.toString(), msg: JSON.stringify({ fund: shipId }) }, { deposit: ONE_YOCTO, gasT: 150 });
    if (!f.ok) throw new Error(`fund: ${f.failure}`);
    tx("fund_reserve_only", f.hash);
  }
  for (let i = 0; i < crewN; i++) {
    const r = await call(crew[i], d.portage, "sign_on", { berth: berths[i], confirmed_daily_wage: DAILY_WAGE.toString(), sea_hash: SEA_HASH });
    if (!r.ok) throw new Error(`sign_on: ${refusal(r.logs, r.failure)}`);
    tx(`sign_on_${i + 1}`, r.hash);
  }
  const start = Date.now();
  out.started_at = new Date(start).toISOString(); save();

  // Wait until the real crew's months owed have gone unpaid on the fast clock, settling as the crank would.
  const waitMs = Number(owedDays * SECS_PER_DAY) * 1000 + 15_000;
  console.log(`waiting ${Math.round(waitMs / 1000)} s for ${owedDays} unpaid ship days`);
  let k = 0;
  while (Date.now() - start < waitMs) {
    await sleep(Math.min(120_000, waitMs - (Date.now() - start)));
    const r = await call(owner, d.portage, "settle", { berth: berths[0] }, { gasT: 100 });
    if (k++ === 0) tx("settle_records_arrears", r.hash);
  }
  const ship = await view<any>(d.portage, "get_ship", { ship_id: shipId });
  out.arrears_before_declare = ship.arrears ?? ship.books?.arrears;
  const dec = await call(crew[0], d.portage, "declare_abandonment", { ship_id: shipId });
  if (!dec.ok) throw new Error(`declare: ${refusal(dec.logs, dec.failure)}`);
  tx("declare_abandonment", dec.hash);

  out.crew = [];
  for (let i = 0; i < crewN; i++) {
    const r = await call(crew[i], d.portage, "release_guarantee", { berth: berths[i] }, { gasT: 100 });
    tx(`release_${i + 1}`, r.hash);
    const ev = r.logs.map((l: string) => { try { return JSON.parse(l.replace(/^EVENT_JSON:/, "")); } catch { return null; } }).find((e: any) => e?.event === "guarantee_released")?.data?.[0] ?? {};
    const owed = DAILY_WAGE * owedDays;
    out.crew.push({ berth: berths[i], holder: crew[i].accountId, owed_wages: owed.toString(), released: ev.amount, covered_wages: ev.covered_wages, allowance: ev.allowance, uncovered: ev.uncovered, ok: r.ok });
  }
  out.finished_at = new Date().toISOString();
  // The real crew were owed `owed_wages`; the guarantee covers them if the wages released are at least that.
  // `uncovered` from the contract also counts the rest of the contract term that abandonment ended.
  out.owed_wages_covered = out.crew.every((c: any) => c.ok && BigInt(c.covered_wages ?? "0") >= BigInt(c.owed_wages));
  out.note = "uncovered = wages for the rest of the 9-month contract beyond the 4-month guarantee, not unpaid arrears";
  save();
  console.log(JSON.stringify(out.crew, null, 2));
  console.log(out.owed_wages_covered ? "OWED WAGES FULLY COVERED" : "OWED WAGES NOT FULLY COVERED");
}

main().catch((e) => { console.error(e); process.exit(1); });
