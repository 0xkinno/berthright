// Verifies Berthright on testnet from a clean clone with no keys:
//   1. portage and allotment hold zero access keys
//   2. their on-chain code hashes equal the build hashes recorded at deploy (and the local wasm, if built)
//   3. every ship is rebuilt from berthright events alone and compared with the contract's views
//   4. each ship's books balance
// `--tamper` changes one event amount before the rebuild; the run must then fail.
// Last line: "N of N checks pass, from M transactions".
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import bs58 from "bs58";
import { accessKeys, codeHash, view, readDeployment, events } from "./lib/near.ts";

const TAMPER = process.argv.includes("--tamper");
const ARCHIVAL = process.env.ARCHIVAL_RPC ?? "https://archival-rpc.testnet.near.org";
const NEARBLOCKS = process.env.NEARBLOCKS_API ?? "https://api-testnet.nearblocks.io/v3";
const d = readDeployment();
const results: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`); };

async function txList(account: string): Promise<{ hash: string; signer: string }[]> {
  const out: { hash: string; signer: string }[] = [];
  let next: string | undefined;
  for (let page = 0; page < 40; page++) {
    const url = `${NEARBLOCKS}/accounts/${account}/txns?limit=100${next ? `&next=${encodeURIComponent(next)}` : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`NearBlocks ${r.status} for ${account}`);
    const j: any = await r.json();
    for (const t of j.data ?? []) out.push({ hash: t.transaction_hash, signer: t.signer_account_id });
    next = j.meta?.next_page;
    if (!next || !(j.data ?? []).length) break;
  }
  return out;
}

async function txLogs(hash: string, signer: string): Promise<string[]> {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(ARCHIVAL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "EXPERIMENTAL_tx_status", params: { tx_hash: hash, sender_account_id: signer, wait_until: "NONE" } }) });
    const j: any = await r.json();
    if (j.result) return (j.result.receipts_outcome ?? []).filter((o: any) => o.outcome.executor_id === d.portage).flatMap((o: any) => o.outcome.logs);
    await new Promise((s) => setTimeout(s, 500));
  }
  return [];
}

function wasmHash(name: string): string | null {
  const p = `target/near/${name}/${name}.wasm`;
  return existsSync(p) ? bs58.encode(createHash("sha256").update(readFileSync(p)).digest()) : null;
}

async function main() {
  for (const c of ["portage", "allotment"] as const) {
    const keys = await accessKeys(d[c]);
    check(`${c} has zero access keys`, keys.length === 0, `${keys.length} keys on ${d[c]}`);
    const onChain = await codeHash(d[c]);
    const recorded = d.code_hashes?.[c]?.wasm_sha256_b58;
    check(`${c} code hash matches the recorded build`, onChain === recorded, `chain ${onChain}, recorded ${recorded}`);
    const local = wasmHash(c);
    if (local) check(`${c} code hash matches the local build`, onChain === local, `chain ${onChain}, local ${local} (build is reproducible only with the pinned image; see README)`);
  }

  const txs = new Map<string, string>();
  for (const acc of [d.portage, d.tusd]) for (const t of await txList(acc)) txs.set(t.hash, t.signer);
  const all: any[] = [];
  for (const [hash, signer] of txs) all.push(...events(await txLogs(hash, signer)).map((e) => ({ ...e, hash })));
  if (TAMPER) {
    const victim = all.find((e) => e.event === "funded");
    if (victim) { victim.data[0].amount = (BigInt(victim.data[0].amount) + 1n).toString(); console.log(`TAMPER: added 1 base unit to funded event in ${victim.hash}`); }
  }
  const rebuilt = new Map<string, { funded: bigint; paid: bigint; withdrawn: bigint; berths: Set<string> }>();
  const ship = (id: string) => { if (!rebuilt.has(id)) rebuilt.set(id, { funded: 0n, paid: 0n, withdrawn: 0n, berths: new Set() }); return rebuilt.get(id)!; };
  for (const e of all) {
    const x = e.data[0];
    const id = String(x.ship_id);
    switch (e.event) {
      case "ship_created": ship(id); break;
      case "berth_opened": ship(id).berths.add(x.berth); break;
      case "funded": ship(id).funded += BigInt(x.amount); break;
      case "settled": case "settled_to_holder": ship(id).paid += BigInt(x.amount); break;
      case "signed_off": ship(id).paid += BigInt(x.paid); break;
      case "guarantee_released": ship(id).paid += BigInt(x.amount); break;
      case "surplus_withdrawn": ship(id).withdrawn += BigInt(x.amount); break;
      case "payment_failed": if (x.kind === "withdrawal") ship(id).withdrawn -= BigInt(x.amount); else ship(id).paid -= BigInt(x.amount); break;
    }
  }
  const count = Number(await view<string>(d.portage, "ship_count"));
  check("every ship appears in the events", rebuilt.size === count, `${rebuilt.size} ships from events, ${count} on chain`);
  for (const [id, r] of [...rebuilt].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const s = await view<any>(d.portage, "get_ship", { ship_id: id });
    const same = BigInt(s.funded_total) === r.funded && BigInt(s.paid_total) === r.paid && BigInt(s.withdrawn_total) === r.withdrawn && s.berths.length === r.berths.size;
    check(`ship ${id} rebuilt from events equals the contract`, same, `events funded ${r.funded} paid ${r.paid} withdrawn ${r.withdrawn} berths ${r.berths.size}; views ${s.funded_total} ${s.paid_total} ${s.withdrawn_total} ${s.berths.length}`);
    const books = BigInt(s.funded_total) === BigInt(s.unreserved) + BigInt(s.reserved) + BigInt(s.payable) + BigInt(s.paid_total) + BigInt(s.withdrawn_total);
    check(`ship ${id} books balance`, books, `funded ${s.funded_total} = free ${s.unreserved} + reserved ${s.reserved} + awaiting ${s.payable} + paid ${s.paid_total} + withdrawn ${s.withdrawn_total}`);
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed} of ${results.length} checks pass, from ${txs.size} transactions`);
  process.exit(passed === results.length ? 0 : 1);
}
main().catch((e) => { console.error(`FAIL verify could not run: ${e.message}`); process.exit(1); });
