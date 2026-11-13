import { view, readDeployment } from "../lib/near.ts";
const d = readDeployment();
console.log("portage storage", await view(d.tusd, "storage_balance_of", { account_id: d.portage }));
console.log("owner tUSD", await view(d.tusd, "ft_balance_of", { account_id: `kestrel-bulk.${d.root}` }));
console.log("portage tUSD", await view(d.tusd, "ft_balance_of", { account_id: d.portage }));
