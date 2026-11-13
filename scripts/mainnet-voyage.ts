// Runs one Berthright voyage on NEAR mainnet with real USDC, at demo scale. Resumable; every transaction
// is recorded in data/mainnet.json.
//   NEAR_NETWORK=mainnet npx tsx scripts/mainnet-voyage.ts
// Funding arrives through NEAR Intents (1Click) from Base. Accounts: berthright.near (root),
// chest.berthright.near (the wage chest, keyless after init), owner.berthright.near (shipowner),
// crew.berthright.near (crew member). The berth is a real House of Stake leased name,
// berthright.seafarer, rented by the crew member in the Open `seafarer` namespace on registry.hos.
import { KeyPair } from "near-api-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { account, call, exists, saveKey, view, milli, ONE_YOCTO, explorerTx, refusal, NETWORK } from "./lib/near.ts";

if (NETWORK !== "mainnet") throw new Error("set NEAR_NETWORK=mainnet");
const OPERATOR = process.env.MAINNET_OPERATOR_ID!;
const JWT = process.env.ONECLICK_JWT!;
const USDC = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const REGISTRY = "registry.hos", TLA = "seafarer", BERTH_NAME = "berthright";
const BERTH = `${BERTH_NAME}.${TLA}`;
const ROOT = "berthright.near", CHEST = `chest.${ROOT}`, OWNER = `owner.${ROOT}`, CREW = `crew.${ROOT}`;
const DAILY = 10_000n;          // 0.01 USDC a ship day
const ALLOWANCE = 100_000n;     // 0.10 USDC fare home
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const F = "data/mainnet.json";
const rec: any = existsSync(F) ? JSON.parse(readFileSync(F, "utf8")) : { network: "mainnet", tx: {}, notes: {} };
const save = () => writeFileSync(F, JSON.stringify(rec, null, 2) + "\n");
const tx = (k: string, h: string) => { rec.tx[k] = h; console.log(k.padEnd(28), explorerTx(h)); save(); };
const near = (y: string | bigint) => Number(BigInt(y) / 10n ** 21n) / 1000;

async function balance(id: string) {
  const r = await fetch("https://free.rpc.fastnear.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: id } }) }).then((r) => r.json());
  return BigInt(r.result?.amount ?? 0);
}
async function mustOk(label: string, p: Promise<any>) {
  const r = await p;
  if (!r.ok) throw new Error(`${label}: ${refusal(r.logs, r.failure) ?? r.failure}`);
  tx(label, r.hash);
  return r;
}
async function oneclick(path: string, body?: object) {
  const r = await fetch(`https://1click.chaindefuser.com${path}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", authorization: `Bearer ${JWT}` }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
async function waitSwap(addr: string) {
  for (let i = 0; i < 60; i++) {
    const s = await oneclick(`/v0/status?depositAddress=${addr}`);
    if (["SUCCESS", "REFUNDED", "FAILED"].includes(s.status)) return s;
    await sleep(10_000);
  }
  throw new Error("swap did not settle");
}
async function subAccount(parent: ReturnType<typeof account>, id: string, nearAmt: number) {
  if (await exists(id)) return account(id);
  const kp = KeyPair.fromRandom("ed25519");
  const r: any = await parent.createSubAccount({ accountOrPrefix: id, publicKey: kp.getPublicKey(), nearToTransfer: milli(nearAmt) } as never);
  saveKey(id, kp);
  tx(`create_${id.split(".")[0]}`, r?.transaction?.hash ?? r?.transaction_outcome?.id ?? "");
  return account(id);
}

async function main() {
  const op = account(OPERATOR);
  console.log("operator", OPERATOR, near(await balance(OPERATOR)), "NEAR");

  // 1. root account, created through the `near` registrar, funded from the operator.
  if (!(await exists(ROOT))) {
    const kp = KeyPair.fromRandom("ed25519");
    saveKey(ROOT, kp);
    const keep = milli(0.12);
    const amt = (await balance(OPERATOR)) - keep;
    await mustOk("create_root", call(op, "near", "create_account", { new_account_id: ROOT, new_public_key: kp.getPublicKey().toString() }, { deposit: amt, gasT: 100 }));
  }
  const root = account(ROOT);
  const chest = await subAccount(root, CHEST, 3.0);
  const crew = await subAccount(root, CREW, 2.75);
  const owner = await subAccount(root, OWNER, 0.95);

  // 2. the wage chest: same reproducible build as testnet, wired to House of Stake's mainnet registry.
  const cfg = await view<any>(CHEST, "config").catch(() => null);
  if (!cfg) {
    const wasm = readFileSync("target/near/portage/portage.wasm");
    rec.notes.chest_wasm_sha256 = createHash("sha256").update(wasm).digest("hex"); save();
    const d: any = await (chest as any).deployContract(wasm);
    tx("deploy_chest", d?.transaction?.hash ?? d?.transaction_outcome?.id ?? "");
    await mustOk("chest_new", call(chest, CHEST, "new", { registry: REGISTRY, registrar: TLA }, { gasT: 100 }));
  }

  // 2b. seal the chest before any money moves: delete its only key. Nobody can upgrade or drain it.
  const keys = await fetch("https://free.rpc.fastnear.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_access_key_list", finality: "final", account_id: CHEST } }) }).then((r) => r.json());
  for (const k of keys.result?.keys ?? []) { const d: any = await (chest as any).deleteKey(k.public_key); tx("seal_chest_delete_key", d?.transaction?.hash ?? d?.transaction_outcome?.id ?? ""); }

  // 3. the berth: a real House of Stake leased name, rented by the crew member themselves.
  if (!(await exists(BERTH))) {
    const price = await view<any>(REGISTRY, "get_rent_price", { tla_id: TLA, name: BERTH_NAME });
    const attach = (BigInt(price.total_yocto) * 102n) / 100n;
    rec.notes.rent_quote_yocto = price.total_yocto; save();
    await mustOk("rent_berth", call(crew, REGISTRY, "rent_sub_account", { tla_id: TLA, name: BERTH_NAME, owner_account: null }, { deposit: attach, gasT: 250 }));
    await sleep(3000);
  }
  const item = await view<any>(BERTH, "nft_item_info");
  const token = await view<any>(REGISTRY, "nft_token", { token_id: BERTH });
  rec.notes.berth_item = { owner: item.owner_id, collection: item.collection_id, rotation_seq: item.rotation_seq, registry_owner: token?.owner_id }; save();
  if (item.owner_id !== CREW || token?.owner_id !== CREW) throw new Error(`berth owner mismatch ${item.owner_id} / ${token?.owner_id}`);

  // 4. USDC storage registration for everyone who will hold it.
  for (const id of [OWNER, CREW, CHEST, BERTH]) {
    const sb = await view<any>(USDC, "storage_balance_of", { account_id: id }).catch(() => null);
    if (!sb) await mustOk(`usdc_register_${id.split(".")[0]}`, call(owner, USDC, "storage_deposit", { account_id: id, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
  }

  // 5. the shipowner buys USDC with NEAR through NEAR Intents (1Click), executed by Berthright itself.
  const usdcBal = BigInt(await view<string>(USDC, "ft_balance_of", { account_id: OWNER }));
  if (usdcBal < 1_400_000n && !rec.notes.owner_swap_done) {
    const amount = milli(0.55);
    const q = await oneclick("/v0/quote", { dry: false, swapType: "EXACT_INPUT", slippageTolerance: 100, originAsset: "nep141:wrap.near", depositType: "ORIGIN_CHAIN", destinationAsset: `nep141:${USDC}`, amount: amount.toString(), recipient: OWNER, recipientType: "DESTINATION_CHAIN", refundTo: OWNER, refundType: "ORIGIN_CHAIN", deadline: new Date(Date.now() + 3600e3).toISOString() });
    const addr = q.quote?.depositAddress; if (!addr) throw new Error("no deposit address: " + JSON.stringify(q).slice(0, 300));
    rec.notes.owner_swap_quote = { depositAddress: addr, amountOut: q.quote.amountOutFormatted }; save();
    const wsb = await view<any>("wrap.near", "storage_balance_of", { account_id: OWNER }).catch(() => null);
    if (!wsb) await mustOk("wnear_register_owner", call(owner, "wrap.near", "storage_deposit", { account_id: OWNER, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
    const dsb = await view<any>("wrap.near", "storage_balance_of", { account_id: addr }).catch(() => null);
    if (!dsb) await mustOk("wnear_register_deposit", call(owner, "wrap.near", "storage_deposit", { account_id: addr, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
    await mustOk("wrap_near", call(owner, "wrap.near", "near_deposit", {}, { deposit: amount, gasT: 30 }));
    await mustOk("intents_deposit_wnear", call(owner, "wrap.near", "ft_transfer", { receiver_id: addr, amount: amount.toString() }, { deposit: ONE_YOCTO, gasT: 50 }));
    const s = await waitSwap(addr);
    rec.notes.owner_swap = { status: s.status, out: s.swapDetails?.amountOutFormatted, nearTxHashes: s.swapDetails?.nearTxHashes }; rec.notes.owner_swap_done = true; save();
    console.log("owner swap", s.status, s.swapDetails?.amountOutFormatted, "USDC");
  }

  // 6. the ship and the berth.
  const SEA = "Seafarer Employment Agreement, MV Berthright (mainnet demo ship). 0.01 USDC per ship day; one ship day is ten seconds.";
  const SEA_HASH = createHash("sha256").update(SEA).digest("hex");
  let shipId: string = rec.notes.ship_id ?? "";
  if (!shipId) {
    const r = await mustOk("create_ship", call(owner, CHEST, "create_ship", { name: "MV Berthright (mainnet demo)", imo: "demo", token: USDC, secs_per_day: "10", reserve_months: 4, grace_days: "14", repatriation_allowance: ALLOWANCE.toString() }, { deposit: milli(0.05), gasT: 50 }));
    shipId = String(r.value); rec.notes.ship_id = shipId; save();
    await mustOk("open_berth", call(owner, CHEST, "open_berth", { ship_id: shipId, berth: BERTH, daily_wage: DAILY.toString(), contract_days: "270", sea_hash: SEA_HASH }, { deposit: milli(0.02), gasT: 50 }));
  }

  // 7. sign-on before the reserve: refused on chain.
  let b = await view<any>(CHEST, "get_berth", { berth: BERTH });
  if (!rec.tx.sign_on_refused && b.status === "Open") {
    const r = await call(crew, CHEST, "sign_on", { berth: BERTH, confirmed_daily_wage: DAILY.toString(), sea_hash: SEA_HASH }, { gasT: 100 });
    if (r.ok) throw new Error("sign-on before reserve was not refused");
    rec.notes.sign_on_refused_code = refusal(r.logs, r.failure); tx("sign_on_refused", r.hash);
  }

  // 8. the owner locks four months plus the fare home, in real USDC; then the crew member signs on.
  const sh = await view<any>(CHEST, "get_ship", { ship_id: shipId });
  const need = BigInt(b.reserve_needed);
  if (BigInt(sh.reserved) + BigInt(sh.unreserved) < need) {
    await mustOk("fund_reserve_usdc", call(owner, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: (need - BigInt(sh.reserved) - BigInt(sh.unreserved)).toString(), msg: JSON.stringify({ fund: shipId }) }, { deposit: ONE_YOCTO, gasT: 150 }));
  }
  b = await view<any>(CHEST, "get_berth", { berth: BERTH });
  if (b.status === "Open") {
    await mustOk("sign_on", call(crew, CHEST, "sign_on", { berth: BERTH, confirmed_daily_wage: DAILY.toString(), sea_hash: SEA_HASH }, { gasT: 100 }));
    rec.notes.signed_on_at = new Date().toISOString(); save();
  }

  // 9. the owner pays nothing more. Settle records arrears; after 14 ship days anyone declares, then releases.
  b = await view<any>(CHEST, "get_berth", { berth: BERTH });
  if (b.status === "Signed") {
    await sleep(25_000);
    if (!rec.tx.settle_arrears) tx("settle_arrears", (await call(op, CHEST, "settle", { berth: BERTH }, { gasT: 100 })).hash);
    const ship = await view<any>(CHEST, "get_ship", { ship_id: shipId });
    if (ship.status === "Active") {
      for (let i = 0; i < 30; i++) {
        const r = await call(op, CHEST, "declare_abandonment", { ship_id: shipId }, { gasT: 100 });
        if (r.ok) { tx("declare_abandonment", r.hash); break; }
        if (!rec.tx.declare_refused_early) { rec.notes.declare_refused_code = refusal(r.logs, r.failure); tx("declare_refused_early", r.hash); }
        await sleep(20_000);
      }
    }
    const r = await mustOk("release_guarantee_usdc", call(op, CHEST, "release_guarantee", { berth: BERTH }, { gasT: 100 }));
    const ev = r.logs.map((l: string) => { try { return JSON.parse(l.replace(/^EVENT_JSON:/, "")); } catch { return null; } }).find((e: any) => e?.event === "guarantee_released")?.data?.[0];
    rec.notes.release = ev; save();
  }

  rec.notes.crew_usdc = await view<string>(USDC, "ft_balance_of", { account_id: CREW });
  rec.notes.finished_at = new Date().toISOString(); save();
  console.log("done", JSON.stringify(rec.notes.release ?? {}), "crew USDC", rec.notes.crew_usdc);
}
main().catch((e) => { console.error(e); process.exit(1); });
