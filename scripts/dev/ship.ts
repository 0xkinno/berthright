import { view, readDeployment } from "../lib/near.ts";
const d = readDeployment();
const s: any = await view(d.portage, "get_ship", { ship_id: "0" });
console.log({ unreserved: s.unreserved, reserved: s.reserved, funded: s.funded_total, berths: s.berths.length });
console.log("owner tUSD", await view(d.tusd, "ft_balance_of", { account_id: `kestrel-bulk.${d.root}` }));
let need = 0n; for (const b of s.berths) { const v: any = await view(d.portage, "get_berth", { berth: b }); need += BigInt(v.reserve_needed); console.log(b, v.status, v.reserve_needed); }
console.log("need", need.toString());
