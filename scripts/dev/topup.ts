// Dev helper: send small NEAR top-ups from the root account.  npx tsx scripts/dev/topup.ts id=0.1 id2=0.2
import { account, milli, readDeployment } from "../lib/near.ts";
async function main() {
  const root = account(readDeployment().root);
  for (const a of process.argv.slice(2)) { const [id, n] = a.split("="); await root.transfer({ receiverId: id, amount: milli(Number(n)) } as never); console.log("sent", id, n); }
}
main().catch((e) => { console.error(e); process.exit(1); });
