import { view, readDeployment } from "../lib/near.ts";
const d = readDeployment();
console.log(await view(d.tusd, "storage_balance_bounds"));
