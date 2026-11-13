import { withFailover } from "../lib/near.ts";
const [hash, sender] = process.argv.slice(2);
const r: any = await withFailover((p) => (p as any).viewTransactionStatusWithReceipts ? (p as any).viewTransactionStatusWithReceipts(hash, sender, "FINAL") : (p as any).txStatus(hash, sender, "FINAL"));
for (const o of r.receipts_outcome) console.log(o.outcome.executor_id, JSON.stringify(o.outcome.status).slice(0, 220), o.outcome.logs.map((l: string) => l.slice(0, 200)));
