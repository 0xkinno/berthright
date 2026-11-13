// Seeds a live demo ship that stays signed on for days: one ship day per hour, four months locked per
// berth plus a wage float, three crew signed on. Labelled as a demo ship on chain.
//   npx tsx scripts/dev/seed-live.ts
import { KeyPair } from "near-api-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { account, call, exists, saveKey, view, milli, ONE_YOCTO, readDeployment, explorerTx, refusal } from "../lib/near.ts";

const d = readDeployment();
const root = account(d.root);
const trust = account(d.trust);
const T = 1_000_000n;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const runs: any = existsSync("data/runs.json") ? JSON.parse(readFileSync("data/runs.json", "utf8")) : {};
const out: any = (runs.live_ship ??= { tx: {} });
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
  const owner = await ensure("heron-lines", 0.45);
  const names = [["arjun2", "ab-heron", 10n], ["meera", "oiler-heron", 9n], ["tunde", "cadet-heron", 6n]] as const;
  const crew = [] as ReturnType<typeof account>[];
  for (const [n] of names) crew.push(await ensure(n, 0.2));
  const SEA = "Seafarer Employment Agreement, MV Heron (demo ship). Wages per the berth. Contract 9 months.";
  const SEA_HASH = createHash("sha256").update(SEA).digest("hex");
  const berths: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const id = `${names[i][1]}.${d.registrar}`;
    if (!(await exists(id))) {
      const r = await call(trust, d.registry, "rent_sub_account_paid", { tla_id: d.registrar, name: names[i][1], owner_account: crew[i].accountId, payout_account: crew[i].accountId, order_id: `live-${names[i][1]}` }, { deposit: milli(0.1), gasT: 200 });
      if (!r.ok) throw new Error(`mint ${id}: ${r.failure}`);
      tx(`mint_${names[i][1]}`, r.hash);
      await sleep(2500);
    }
    berths.push(id);
  }
  for (const who of [owner, ...crew]) await call(who, d.tusd, "storage_deposit", { account_id: who.accountId, registration_only: true }, { deposit: milli(0.00125) });
  for (const b of berths) await call(owner, d.tusd, "storage_deposit", { account_id: b, registration_only: true }, { deposit: milli(0.00125) });
  if (!out.faucet) { const f = await call(owner, d.tusd, "faucet", {}); out.faucet = f.hash; save(); }
  let shipId: string = out.ship_id ?? "";
  if (!shipId) {
    const cs = await call(owner, d.portage, "create_ship", { name: "MV Heron (demo ship)", imo: "IMO 0000001 (demo)", token: d.tusd, secs_per_day: "3600", reserve_months: 4, grace_days: "14", repatriation_allowance: (50n * T).toString() }, { deposit: milli(0.05) });
    if (!cs.ok) throw new Error(`create_ship: ${cs.failure}`);
    shipId = String(cs.value); out.ship_id = shipId; tx("create_ship", cs.hash);
    for (let i = 0; i < berths.length; i++) tx(`open_${names[i][1]}`, (await call(owner, d.portage, "open_berth", { ship_id: shipId, berth: berths[i], daily_wage: (names[i][2] * T).toString(), contract_days: "270", sea_hash: SEA_HASH }, { deposit: milli(0.02) })).hash);
  }
  const bal = BigInt(await view<string>(d.tusd, "ft_balance_of", { account_id: owner.accountId }));
  const sh = await view<any>(d.portage, "get_ship", { ship_id: shipId });
  if (BigInt(sh.funded_total) === 0n) {
    const f = await call(owner, d.tusd, "ft_transfer_call", { receiver_id: d.portage, amount: bal.toString(), msg: JSON.stringify({ fund: shipId }) }, { deposit: ONE_YOCTO, gasT: 150 });
    if (!f.ok) throw new Error(`fund: ${f.failure}`);
    tx("fund", f.hash);
  }
  for (let i = 0; i < berths.length; i++) {
    const b = await view<any>(d.portage, "get_berth", { berth: berths[i] });
    if (b.status === "Signed") continue;
    const r = await call(crew[i], d.portage, "sign_on", { berth: berths[i], confirmed_daily_wage: b.daily_wage, sea_hash: SEA_HASH });
    if (!r.ok) throw new Error(`sign_on ${berths[i]}: ${refusal(r.logs, r.failure)}`);
    tx(`sign_on_${names[i][1]}`, r.hash);
  }
  console.log(JSON.stringify(await view<any>(d.portage, "coverage", { ship_id: shipId })));
}
main().catch((e) => { console.error(e); process.exit(1); });
