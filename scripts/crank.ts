// The unattended crank: settles every signed berth, runs every due allotment, declares abandonment
// where the grace has ended, and releases guarantees on abandoned ships. Anyone may call each of
// these; the crank key is a function-call key limited to exactly these methods.
// Env: CRANK_ACCOUNT_ID, CRANK_PRIVATE_KEY (or ~/.near-credentials). Writes data/crank-last.json.
import { writeFileSync } from "node:fs";
import { account, call, view, readDeployment, explorerTx, refusal } from "./lib/near.ts";

const d = readDeployment();
const signerId = process.env.CRANK_ACCOUNT_ID ?? `crank.${d.root}`;
// Two function-call keys: one limited to portage's permissionless methods, one to allotment.run.
const crank = account(signerId, (process.env.CRANK_PRIVATE_KEY as never) || undefined);
const crankAllot = process.env.CRANK_ALLOTMENT_KEY ? account(signerId, process.env.CRANK_ALLOTMENT_KEY as never) : crank;
const now = () => BigInt(Date.now()) * 1_000_000n;

async function main() {
  const out: { action: string; target: string; hash: string; ok: boolean; note: string }[] = [];
  const count = Number(await view<string>(d.portage, "ship_count"));
  const ships: any[] = [];
  for (let i = 0; i < count; i += 50) ships.push(...(await view<any[]>(d.portage, "list_ships", { from_index: String(i), limit: 50 })));
  const seen = new Set<string>();
  for (const s of ships) {
    if (seen.has(s.ship_id) || s.status === "Closed") continue;
    seen.add(s.ship_id);
    for (const b of s.berths as string[]) {
      const v = await view<any>(d.portage, "get_berth", { berth: b });
      if (s.status === "Abandoned" && v.status === "Signed") {
        const r = await call(crank, d.portage, "release_guarantee", { berth: b }, { gasT: 150 });
        out.push({ action: "release_guarantee", target: b, hash: r.hash, ok: r.ok, note: refusal(r.logs, r.failure) ?? "" });
        continue;
      }
      if (v.status === "Signed" && (BigInt(v.due_now) > 0n || BigInt(v.payable) > 0n)) {
        const r = await call(crank, d.portage, "settle", { berth: b }, { gasT: 150 });
        out.push({ action: "settle", target: b, hash: r.hash, ok: r.ok, note: String(r.value ?? refusal(r.logs, r.failure) ?? "") });
      }
      const a = await view<any>(d.allotment, "get_allotment", { berth: b }).catch(() => null);
      if (a && !a.stopped && !a.running && BigInt(a.next_due_ns) <= now()) {
        const r = await call(crankAllot, d.allotment, "run", { berth: b }, { gasT: 250 });
        out.push({ action: "allotment.run", target: b, hash: r.hash, ok: r.ok, note: String(r.value ?? refusal(r.logs, r.failure) ?? "") });
      }
    }
    if (s.status === "Active") {
      const cov = await view<any>(d.portage, "coverage", { ship_id: s.ship_id });
      if (BigInt(cov.arrears) > 0n && cov.grace_left_secs !== null && Number(cov.grace_left_secs) === 0) {
        const r = await call(crank, d.portage, "declare_abandonment", { ship_id: s.ship_id }, { gasT: 150 });
        out.push({ action: "declare_abandonment", target: `ship ${s.ship_id}`, hash: r.hash, ok: r.ok, note: refusal(r.logs, r.failure) ?? "" });
      }
    }
  }
  const record = { at: new Date().toISOString(), signer: signerId, run_url: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null, actions: out };
  writeFileSync("data/crank-last.json", JSON.stringify(record, null, 2) + "\n");
  for (const o of out) console.log(`${o.ok ? "ok  " : "FAIL"} ${o.action} ${o.target} ${o.note} ${explorerTx(o.hash)}`);
  console.log(`${out.length} actions, ${out.filter((o) => o.ok).length} landed, no human involved`);
}
main().catch((e) => { console.error(e); process.exit(1); });
