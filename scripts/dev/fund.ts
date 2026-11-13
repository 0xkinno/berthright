import { account, call, view, readDeployment, ONE_YOCTO } from "../lib/near.ts";
const d = readDeployment();
console.log("portage registered on tusd:", await view(d.tusd, "storage_balance_of", { account_id: d.portage }));
const owner = account(`kestrel-bulk.${d.root}`);
const r = await call(owner, d.tusd, "ft_transfer_call", { receiver_id: d.portage, amount: "3320000000", msg: JSON.stringify({ fund: "0" }) }, { deposit: ONE_YOCTO, gasT: 150 });
console.log(r.ok, r.hash, r.failure?.slice(0, 300), r.logs.slice(-3));
