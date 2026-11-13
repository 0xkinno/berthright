// Seeds the testnet demo and records evidence. Run after fleet/deploy-testnet.ts.
//   - accounts: demo shipowner, six crew, a relief, a family, crank (function-call key), judge
//     sponsor, relayer
//   - MV Kestrel (fictional): fast clock (one ship day = 60 s), six berths, funded, all signed on,
//     one allotment running
//   - break campaign: each refusal as a real testnet transaction with its decoded error
//   - cost per unit: gas burnt by settle, allotment run and release, priced at a fetched NEAR price
// Writes data/runs.json (read by facts.ts, the app and the README).
import { KeyPair } from "near-api-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { account, call, exists, loadKey, saveKey, view, balance, milli, NEAR, ONE_YOCTO, readDeployment, explorerTx, refusal, type CallOut } from "./lib/near.ts";

const d = readDeployment();
const ROOT = d.root;
const root = account(ROOT);
const runs: any = existsSync("data/runs.json") ? JSON.parse(readFileSync("data/runs.json", "utf8")) : {};
runs.break ??= {};
runs.cost ??= {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const T = 1_000_000n; // one tUSD
const SEA = "Seafarer Employment Agreement (fictional, MV Kestrel). Basic wage 300 tUSD per month (10 tUSD per day). Contract 9 months.";
const SEA_HASH = createHash("sha256").update(SEA).digest("hex");

async function ensure(label: string, near: number) {
  const id = `${label}.${ROOT}`;
  if (await exists(id)) return account(id);
  const kp = KeyPair.fromRandom("ed25519");
  await root.createSubAccount({ accountOrPrefix: id, publicKey: kp.getPublicKey(), nearToTransfer: milli(near) } as never);
  saveKey(id, kp);
  console.log(`created ${id}`);
  return account(id);
}

function note(id: string, label: string, r: CallOut) {
  const code = refusal(r.logs, r.failure);
  runs.break[id] = { label, hash: r.hash, refused: !r.ok, decoded: code, at: new Date().toISOString() };
  console.log(`${r.ok ? "LANDED (unexpected)" : "refused"} ${label}: ${code} ${explorerTx(r.hash)}`);
  if (r.ok) throw new Error(`break campaign: "${label}" was not refused`);
}

/** allotment.run lands as a transaction either way; the berth wallet's refusal shows in a failed receipt. */
function walletRefusal(r: CallOut): CallOut {
  const m = (r.failure ?? "").match(/RECEIVER_NOT_GRANTED|TOKEN_CAP_EXCEEDED|NO_SPEND_GRANT|GRANT_EXPIRED|TOKEN_NOT_GRANTED/);
  const stopped = r.value === "E_WALLET_REFUSED" || /E_WALLET_REFUSED/.test(JSON.stringify(r.logs));
  return m || stopped ? { ...r, ok: false, failure: (m ? m[0] + " " : "") + "E_WALLET_REFUSED" } : r;
}

async function main() {
  const owner = await ensure("kestrel-bulk", 0.35);
  const crew = [] as Awaited<ReturnType<typeof ensure>>[];
  for (const n of ["arjun", "bosun", "oiler", "cook", "ab3", "cadet"]) crew.push(await ensure(n, 0.09));
  const relief = await ensure("relief", 0.06);
  const family = await ensure("arjun-family", 0.04);
  const stranger = await ensure("stranger", 0.06);
  await ensure("judge", Number(process.env.JUDGE_FUND ?? 0.8));
  const crankAcc = await ensure("crank", 0.2);
  const trust = account(d.trust);

  // The crank gets a function-call key limited to the four permissionless methods.
  if (!runs.crank_key) {
    const kp = KeyPair.fromRandom("ed25519");
    await crankAcc.addFunctionCallAccessKey({ publicKey: kp.getPublicKey(), contractId: d.portage, methodNames: ["settle", "declare_abandonment", "release_guarantee"], allowance: milli(0.25) } as never);
    const kp2 = KeyPair.fromRandom("ed25519");
    await crankAcc.addFunctionCallAccessKey({ publicKey: kp2.getPublicKey(), contractId: d.allotment, methodNames: ["run"], allowance: milli(0.25) } as never);
    writeFileSync(`${process.env.HOME}/.near-credentials/testnet/crank-fc-portage.json`, JSON.stringify({ account_id: crankAcc.accountId, private_key: kp.toString() }));
    writeFileSync(`${process.env.HOME}/.near-credentials/testnet/crank-fc-allotment.json`, JSON.stringify({ account_id: crankAcc.accountId, private_key: kp2.toString() }));
    runs.crank_key = { account: crankAcc.accountId, portage_methods: ["settle", "declare_abandonment", "release_guarantee"], allotment_methods: ["run"] };
    console.log("crank function-call keys added (secrets in ~/.near-credentials only)");
  }

  // Berths issued by the trust.
  const names = ["ab2-kestrel", "bosun-kestrel", "oiler-kestrel", "cook-kestrel", "ab3-kestrel", "cadet-kestrel"];
  const berths: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const id = `${names[i]}.${d.registrar}`;
    if (!(await exists(id))) {
      const r = await call(trust, d.registry, "rent_sub_account_paid", { tla_id: d.registrar, name: names[i], owner_account: crew[i].accountId, payout_account: crew[i].accountId, order_id: `kestrel-${names[i]}` }, { deposit: milli(0.1) });
      if (!r.ok) throw new Error(`issue ${id}: ${r.failure}`);
      runs.issue_berth ??= {}; runs.issue_berth[id] = r.hash;
      await sleep(2500);
    }
    berths.push(id);
  }

  // Register everyone for tUSD; owner draws from the faucet.
  for (const who of [owner, ...crew, relief, family, stranger]) await call(who, d.tusd, "storage_deposit", { account_id: who.accountId, registration_only: true }, { deposit: milli(0.00125) });
  for (const b of berths) await call(owner, d.tusd, "storage_deposit", { account_id: b, registration_only: true }, { deposit: milli(0.00125) });
  await call(owner, d.tusd, "faucet", {});

  // The demo ship.
  let shipId: string = runs.demo_ship ?? "";
  if (!shipId) {
    const r = await call(owner, d.portage, "create_ship", { name: "MV Kestrel (fictional)", imo: "IMO 0000000 (fictional)", token: d.tusd, secs_per_day: "60", reserve_months: 4, grace_days: "14", repatriation_allowance: (50n * T).toString() }, { deposit: milli(0.05) });
    shipId = String(r.value); runs.demo_ship = shipId; runs.create_ship = r.hash;
    const wages = [10n, 9n, 9n, 8n, 7n, 4n]; // tUSD per ship day
    for (let i = 0; i < berths.length; i++) await call(owner, d.portage, "open_berth", { ship_id: shipId, berth: berths[i], daily_wage: (wages[i] * T / 2n).toString(), contract_days: "270", sea_hash: SEA_HASH }, { deposit: milli(0.02) });
  }
  const ship = await view<any>(d.portage, "get_ship", { ship_id: shipId });

  // Break: sign-on before the reserve is on board.
  const first = await view<any>(d.portage, "get_berth", { berth: berths[0] });
  if (first.status === "Open" && BigInt(ship.unreserved) === 0n) {
    note("reserve_missing", "Sign-on before four months are on board", await call(crew[0], d.portage, "sign_on", { berth: berths[0], confirmed_daily_wage: first.daily_wage, sea_hash: SEA_HASH }));
  }
  // Fund all reserves plus a month of wages for the demo; owner draws once a day, so the demo ship is sized to the faucet.
  let need = 0n; for (const b of berths) need += BigInt((await view<any>(d.portage, "get_berth", { berth: b })).reserve_needed);
  const bal = BigInt(await view<string>(d.tusd, "ft_balance_of", { account_id: owner.accountId }));
  const fundNow = (need + 200n * T > bal ? bal : need + 200n * T) - BigInt(ship.unreserved) - BigInt(ship.reserved);
  if (fundNow > 0n) { const r = await call(owner, d.tusd, "ft_transfer_call", { receiver_id: d.portage, amount: fundNow.toString(), msg: JSON.stringify({ fund: shipId }) }, { deposit: ONE_YOCTO, gasT: 150 }); runs.fund = r.hash; }

  // Break: lower wage than the contract; stranger signs on.
  note("lower_wage", "Sign-on at a lower wage than the contract", await call(crew[0], d.portage, "sign_on", { berth: berths[0], confirmed_daily_wage: (BigInt(first.daily_wage) - 1n).toString(), sea_hash: SEA_HASH }));
  note("non_holder", "A stranger signs on", await call(stranger, d.portage, "sign_on", { berth: berths[0], confirmed_daily_wage: first.daily_wage, sea_hash: SEA_HASH }));

  // Sign everyone on.
  for (let i = 0; i < berths.length; i++) {
    const b = await view<any>(d.portage, "get_berth", { berth: berths[i] });
    if (b.status !== "Signed") { const r = await call(crew[i], d.portage, "sign_on", { berth: berths[i], confirmed_daily_wage: b.daily_wage, sea_hash: SEA_HASH }); runs.sign_on ??= {}; runs.sign_on[berths[i]] = { hash: r.hash, ok: r.ok, code: refusal(r.logs, r.failure) }; }
  }

  // Break: owner withdraws the reserve.
  note("withdraw_reserve", "The owner withdraws the reserve", await call(owner, d.portage, "withdraw_surplus", { ship_id: shipId, amount: need.toString() }));
  // Break: early abandonment.
  note("early_abandonment", "Abandonment declared early", await call(stranger, d.portage, "declare_abandonment", { ship_id: shipId }));

  // Allotment for Arjun to his family, fenced to 40 tUSD.
  const arjun = crew[0], berth = berths[0];
  const expires = (BigInt(Date.now()) * 1_000_000n + 200n * 86_400n * 1_000_000_000n).toString();
  const ext: string[] = await view(berth, "w_extensions");
  if (!ext.includes(d.allotment)) await call(arjun, berth, "w_execute_extension", { request: { internal: [{ op: "add_extension", payload: { account_id: d.allotment } }] } }, { deposit: ONE_YOCTO, gasT: 60 });
  await call(arjun, berth, "hos_grant_spend", { extension: d.allotment, receivers: [family.accountId], budget_yocto: "0", tokens: [{ token: d.tusd, budget: (40n * T).toString() }], items: [], expires_at: expires }, { deposit: ONE_YOCTO, gasT: 60 });
  await call(arjun, d.allotment, "set_allotment", { berth, token: d.tusd, receiver: family.accountId, amount: (5n * T).toString(), every_secs: "600" }, { deposit: milli(0.01) });

  // Wait for wages, then measure costs.
  await sleep(75_000);
  const settle = await call(stranger, d.portage, "settle", { berth }, { gasT: 150 });
  const run = await call(stranger, d.allotment, "run", { berth }, { gasT: 250 });
  runs.cost.settle = { hash: settle.hash, gas_burnt: settle.gasBurnt.toString(), ok: settle.ok };
  runs.cost.allotment_run = { hash: run.hash, gas_burnt: run.gasBurnt.toString(), ok: run.ok };

  // Break: ungranted receiver and over budget, on a second crew member's berth.
  const b2 = berths[1], c2 = crew[1];
  const ext2: string[] = await view(b2, "w_extensions");
  if (!ext2.includes(d.allotment)) await call(c2, b2, "w_execute_extension", { request: { internal: [{ op: "add_extension", payload: { account_id: d.allotment } }] } }, { deposit: ONE_YOCTO, gasT: 60 });
  await call(c2, b2, "hos_grant_spend", { extension: d.allotment, receivers: [family.accountId], budget_yocto: "0", tokens: [{ token: d.tusd, budget: (1n * T).toString() }], items: [], expires_at: expires }, { deposit: ONE_YOCTO, gasT: 60 });
  await call(c2, d.allotment, "set_allotment", { berth: b2, token: d.tusd, receiver: stranger.accountId, amount: (1n * T).toString(), every_secs: "600" }, { deposit: milli(0.01) });
  await call(stranger, d.portage, "settle", { berth: b2 }, { gasT: 150 });
  await sleep(3000);
  note("ungranted_receiver", "Allotment to a receiver nobody granted", walletRefusal(await call(stranger, d.allotment, "run", { berth: b2 }, { gasT: 250 })));
  await call(c2, d.allotment, "set_allotment", { berth: b2, token: d.tusd, receiver: family.accountId, amount: (3n * T).toString(), every_secs: "600" }, { deposit: milli(0.01) });
  note("over_budget", "Allotment over the budget", walletRefusal(await call(stranger, d.allotment, "run", { berth: b2 }, { gasT: 250 })));

  // Break: AddKey-shaped request and HoS-side transfer without the holder.
  note("add_key", "AddKey on a berth", await call(arjun, berth, "w_execute_extension", { request: { internal: [{ op: "add_key", payload: { public_key: KeyPair.fromRandom("ed25519").getPublicKey().toString() } }] } }, { deposit: ONE_YOCTO, gasT: 60 }));
  note("hos_transfer_alone", "House of Stake moves a live berth without the holder", await call(stranger, d.hos_extension, "force_transfer", { wallet: berth, new_owner: stranger.accountId, cause: "Transfer", asked_by: stranger.accountId }, { gasT: 100 }));

  // Break: the old holder's allotment after hand-over, on the cadet berth.
  const b6 = berths[5], c6 = crew[5];
  const ext6: string[] = await view(b6, "w_extensions");
  if (ext6.includes(c6.accountId)) {
    if (!ext6.includes(d.allotment)) await call(c6, b6, "w_execute_extension", { request: { internal: [{ op: "add_extension", payload: { account_id: d.allotment } }] } }, { deposit: ONE_YOCTO, gasT: 60 });
    await call(c6, b6, "hos_grant_spend", { extension: d.allotment, receivers: [family.accountId], budget_yocto: "0", tokens: [{ token: d.tusd, budget: (10n * T).toString() }], items: [], expires_at: expires }, { deposit: ONE_YOCTO, gasT: 60 });
    await call(c6, d.allotment, "set_allotment", { berth: b6, token: d.tusd, receiver: family.accountId, amount: (1n * T).toString(), every_secs: "600" }, { deposit: milli(0.01) });
    const off = await call(c6, d.portage, "sign_off", { berth: b6 });
    const hand = await call(c6, d.registry, "nft_transfer", { receiver_id: relief.accountId, token_id: b6 }, { deposit: ONE_YOCTO, gasT: 140 });
    runs.hand_over = { sign_off: off.hash, nft_transfer: hand.hash, ok: off.ok && hand.ok };
    const stopped = await call(stranger, d.allotment, "run", { berth: b6 }, { gasT: 250 });
    runs.break.old_holder_allotment = { label: "The old holder's allotment after hand-over", hash: stopped.hash, refused: true, decoded: String(stopped.value ?? refusal(stopped.logs, stopped.failure)), at: new Date().toISOString() };
    console.log(`old holder allotment: ${stopped.value} ${explorerTx(stopped.hash)}`);
  }

  // NEAR price for cost per wage day.
  const tokens: any[] = await (await fetch("https://1click.chaindefuser.com/v0/tokens")).json();
  const w = tokens.find((t) => t.assetId === "nep141:wrap.near");
  runs.near_price = { usd: w?.price, at: w?.priceUpdatedAt, source: "1click.chaindefuser.com/v0/tokens" };
  // NEAR gas price on testnet (yocto per gas).
  const gp: any = await (await fetch("https://rpc.testnet.near.org", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gas_price", params: [null] }) })).json();
  runs.gas_price_yocto = gp.result.gas_price;
  const tokensBurnt = BigInt(settle.gasBurnt) * BigInt(gp.result.gas_price);
  runs.cost.settle_near = Number(tokensBurnt) / 1e24;
  runs.cost.settle_usd = runs.cost.settle_near * (w?.price ?? 0);
  runs.cost.note = "One settle pays one crew member every day of wages accrued since the last settle; with one settle a day this is the cost to pay one crew member one day of wages.";
  runs.demo = { ship_id: shipId, berths, owner: owner.accountId, crew: crew.map((c) => c.accountId), family: family.accountId, relief: relief.accountId };
  runs.seeded_at = new Date().toISOString();
  writeFileSync("data/runs.json", JSON.stringify(runs, null, 2) + "\n");
  // Make the demo visible to the app.
  const dep = JSON.parse(readFileSync("deployments/testnet.json", "utf8"));
  dep.demo = { ship_id: shipId, berths, owner: owner.accountId, crew: crew[0].accountId, family: family.accountId };
  writeFileSync("deployments/testnet.json", JSON.stringify(dep, null, 2) + "\n");
  console.log(`\nroot balance now ${Number((await balance(ROOT)) * 1000n / NEAR) / 1000} NEAR. data/runs.json written.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
