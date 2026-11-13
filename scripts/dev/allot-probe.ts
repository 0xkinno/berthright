// Dev helper: one allotment.run with the crank's allotment function-call key, to size its gas.
import { readFileSync } from "node:fs";
import { account, call, readDeployment } from "../lib/near.ts";
async function main() {
  const d = readDeployment();
  const k = JSON.parse(readFileSync(`${process.env.HOME}/.near-credentials/testnet/crank-fc-allotment.json`, "utf8"));
  const acc = account(k.account_id, k.private_key);
  const r = await call(acc, d.allotment, "run", { berth: process.argv[2] }, { gasT: Number(process.argv[3] ?? 160) });
  console.log(r.ok, r.hash, r.value, r.failure);
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
