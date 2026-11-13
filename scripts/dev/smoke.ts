import { view, balance, accessKeys, codeHash } from "../lib/near.ts";
console.log(await view("wrap.testnet", "ft_metadata"));
console.log(await balance("berthright.testnet"), (await accessKeys("berthright.testnet")).length, await codeHash("wrap.testnet"));
