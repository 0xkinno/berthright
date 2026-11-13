import { view, accessKeys, codeHash, balance, readDeployment } from "../lib/near.ts";
const d = readDeployment();
console.log("portage config", await view(d.portage, "config"));
console.log("allotment stats", await view(d.allotment, "stats"));
console.log("tusd", (await view<any>(d.tusd, "ft_metadata")).symbol);
console.log("crew tla", JSON.stringify(await view(d.registry, "get_tla", { tla_id: d.registrar })).slice(0, 160));
console.log("trust bound", await view(d.registry, "is_payment_authority_bound", { account_id: d.trust, tla_id: d.registrar }));
for (const c of ["portage", "allotment", "tusd"]) console.log(c, "keys", (await accessKeys(d[c])).length, "hash", await codeHash(d[c]), "recorded", d.code_hashes[c].wasm_sha256_b58);
console.log("root NEAR", Number(await balance(d.root)) / 1e24);
