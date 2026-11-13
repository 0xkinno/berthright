import { account, call, view, readDeployment, milli, ONE_YOCTO } from "../lib/near.ts";
const d = readDeployment();
const owner = account(`kestrel-bulk.${d.root}`);
const r = await call(owner, d.tusd, "storage_deposit", { account_id: d.portage, registration_only: true }, { deposit: milli(0.00125), gasT: 30 });
console.log("register", r.ok, r.failure?.slice(0, 200), r.hash);
console.log("portage storage", await view(d.tusd, "storage_balance_of", { account_id: d.portage }));
