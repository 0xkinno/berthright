import { account, call, milli, readDeployment, view } from "../lib/near.ts";
const d = readDeployment();
const owner = account(`kestrel-bulk.${d.root}`);
console.log("ships", await view(d.portage, "ship_count"));
const r = await call(owner, d.portage, "create_ship", { name: "MV Kestrel (fictional)", imo: "IMO 0000000 (fictional)", token: d.tusd, secs_per_day: "60", reserve_months: 4, grace_days: "14", repatriation_allowance: "50000000" }, { deposit: milli(0.05) });
console.log(r.ok, r.value, r.failure, r.hash);
