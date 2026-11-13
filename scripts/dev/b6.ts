import { view, readDeployment } from "../lib/near.ts";
const d = readDeployment();
const b = `cadet-kestrel.${d.registrar}`;
console.log(await view(b, "nft_item_info"), (await view<any>(d.portage, "get_berth", { berth: b })).status);
