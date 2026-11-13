// Dev helper: return the mainnet leftovers to the funder's Base wallet as USDC, through NEAR Intents (1Click).
//   NEAR_NETWORK=mainnet REFUND_TO=0x... npx tsx scripts/dev/mainnet-refund.ts
// Leaves a few cents of NEAR on each demo account so the mainnet evidence stays live.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { account, call, view, milli, ONE_YOCTO, explorerTx, NETWORK } from "../lib/near.ts";

if (NETWORK !== "mainnet") throw new Error("set NEAR_NETWORK=mainnet");
const TO = process.env.REFUND_TO!; if (!/^0x[0-9a-fA-F]{40}$/.test(TO)) throw new Error("REFUND_TO must be a Base address");
const JWT = process.env.ONECLICK_JWT!;
const USDC = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const BASE_USDC = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
const OP = process.env.MAINNET_OPERATOR_ID!, ROOT = "berthright.near", OWNER = "owner.berthright.near", CREW = "crew.berthright.near";
const F = "data/mainnet.json";
const rec: any = existsSync(F) ? JSON.parse(readFileSync(F, "utf8")) : { tx: {}, notes: {} };
rec.refund ??= { to: TO, tx: {} };
const save = () => writeFileSync(F, JSON.stringify(rec, null, 2) + "\n");
const tx = (k: string, h: string) => { rec.refund.tx[k] = h; console.log(k.padEnd(26), explorerTx(h)); save(); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function bal(id: string) { const r = await fetch("https://free.rpc.fastnear.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: id } }) }).then((r) => r.json()); return BigInt(r.result.amount); }
async function ok(label: string, p: Promise<any>) { const r = await p; if (!r.ok) throw new Error(`${label}: ${r.failure}`); tx(label, r.hash); return r; }
async function oc(path: string, body?: object) { return (await fetch(`https://1click.chaindefuser.com${path}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", authorization: `Bearer ${JWT}` }, body: body ? JSON.stringify(body) : undefined })).json(); }
async function settle(addr: string) { for (let i = 0; i < 60; i++) { const s = await oc(`/v0/status?depositAddress=${addr}`); if (["SUCCESS", "REFUNDED", "FAILED"].includes(s.status)) return s; await sleep(10_000); } throw new Error("swap did not settle"); }
async function quote(origin: string, amount: bigint, refundTo: string) {
  const q = await oc("/v0/quote", { dry: false, swapType: "EXACT_INPUT", slippageTolerance: 100, originAsset: origin, depositType: "ORIGIN_CHAIN", destinationAsset: BASE_USDC, amount: amount.toString(), recipient: TO, recipientType: "DESTINATION_CHAIN", refundTo, refundType: "ORIGIN_CHAIN", deadline: new Date(Date.now() + 3600e3).toISOString() });
  if (!q.quote?.depositAddress) throw new Error("quote failed: " + JSON.stringify(q).slice(0, 300));
  return q.quote;
}

async function main() {
  const owner = account(OWNER), crew = account(CREW), root = account(ROOT), op = account(OP);
  // USDC: crew's released guarantee joins the owner's change; one swap to Base USDC.
  const crewUsdc = BigInt(await view<string>(USDC, "ft_balance_of", { account_id: CREW }));
  if (crewUsdc > 0n) await ok("crew_usdc_to_owner", call(crew, USDC, "ft_transfer", { receiver_id: OWNER, amount: crewUsdc.toString() }, { deposit: ONE_YOCTO, gasT: 30 }));
  const usdc = BigInt(await view<string>(USDC, "ft_balance_of", { account_id: OWNER }));
  if (usdc > 0n && !rec.refund.usdc_done) {
    const q = await quote(`nep141:${USDC}`, usdc, OWNER);
    const sb = await view<any>(USDC, "storage_balance_of", { account_id: q.depositAddress }).catch(() => null);
    if (!sb) await ok("usdc_register_deposit", call(owner, USDC, "storage_deposit", { account_id: q.depositAddress, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
    await ok("usdc_to_intents", call(owner, USDC, "ft_transfer", { receiver_id: q.depositAddress, amount: usdc.toString() }, { deposit: ONE_YOCTO, gasT: 50 }));
    const s = await settle(q.depositAddress);
    rec.refund.usdc = { status: s.status, in: s.swapDetails?.amountInFormatted, out: s.swapDetails?.amountOutFormatted, base_tx: s.swapDetails?.destinationChainTxHashes }; rec.refund.usdc_done = true; save();
    console.log("USDC refund", s.status, s.swapDetails?.amountOutFormatted);
  }
  // NEAR: gather on the root, keep a few cents everywhere, one swap to Base USDC.
  for (const [acc, id, keep] of [[crew, CREW, 0.03], [owner, OWNER, 0.03], [op, OP, 0.01]] as const) {
    const free = (await bal(id)) - milli(keep);
    if (free > milli(0.02)) { const r: any = await (acc as any).transfer({ receiverId: ROOT, amount: free }); tx(`gather_${id.slice(0, 5)}`, r?.transaction?.hash ?? r?.transaction_outcome?.id ?? ""); }
  }
  if (!rec.refund.near_done) {
    const amount = (await bal(ROOT)) - milli(0.12);
    const q = await quote("nep141:wrap.near", amount, ROOT);
    const ws = await view<any>("wrap.near", "storage_balance_of", { account_id: ROOT }).catch(() => null);
    if (!ws) await ok("wnear_register_root", call(root, "wrap.near", "storage_deposit", { account_id: ROOT, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
    const ds = await view<any>("wrap.near", "storage_balance_of", { account_id: q.depositAddress }).catch(() => null);
    if (!ds) await ok("wnear_register_deposit", call(root, "wrap.near", "storage_deposit", { account_id: q.depositAddress, registration_only: true }, { deposit: milli(0.00125), gasT: 30 }));
    await ok("wrap_near", call(root, "wrap.near", "near_deposit", {}, { deposit: amount, gasT: 30 }));
    await ok("wnear_to_intents", call(root, "wrap.near", "ft_transfer", { receiver_id: q.depositAddress, amount: amount.toString() }, { deposit: ONE_YOCTO, gasT: 50 }));
    const s = await settle(q.depositAddress);
    rec.refund.near = { status: s.status, in: s.swapDetails?.amountInFormatted, out: s.swapDetails?.amountOutFormatted, base_tx: s.swapDetails?.destinationChainTxHashes }; rec.refund.near_done = true; save();
    console.log("NEAR refund", s.status, s.swapDetails?.amountOutFormatted, "USDC");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
