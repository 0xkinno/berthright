import { account, call, view, readDeployment, milli } from "../lib/near.ts";
import { actions } from "near-api-js";
const d = readDeployment();
const owner = account(`kestrel-bulk.${d.root}`);
const r = await call(owner, d.tusd, "storage_deposit", { account_id: d.portage, registration_only: true }, { deposit: milli(0.00125), gasT: 30 });
console.log("register", r.ok, r.hash, await view(d.tusd, "storage_balance_of", { account_id: d.portage }));
try {
  await owner.signAndSendTransaction({ receiverId: d.portage, actions: [actions.functionCall("declare_abandonment", { ship_id: "0" }, 30n * 10n ** 12n, 0n)], waitUntil: "FINAL" } as never);
} catch (e: any) {
  console.log("keys", Object.keys(e), e.constructor?.name);
  for (const k of Object.keys(e)) console.log(k, JSON.stringify(e[k])?.slice(0, 300));
}
