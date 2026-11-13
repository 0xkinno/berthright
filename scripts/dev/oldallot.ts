import { readFileSync, writeFileSync } from "node:fs";
import { account, call, readDeployment, explorerTx } from "../lib/near.ts";
const d = readDeployment();
const runs = JSON.parse(readFileSync("data/runs.json", "utf8"));
const r = await call(account(`stranger.${d.root}`), d.allotment, "run", { berth: `cadet-kestrel.${d.registrar}` }, { gasT: 250 });
console.log("run", r.value, r.failure?.slice(0, 160), r.logs.filter((l) => l.includes("stopped")).map((l) => l.slice(0, 200)), explorerTx(r.hash));
if (r.value === "E_BERTH_CHANGED_HANDS") { runs.break.old_holder_allotment = { label: "The old holder's allotment after hand-over", hash: r.hash, refused: true, decoded: "E_BERTH_CHANGED_HANDS", at: new Date().toISOString() }; writeFileSync("data/runs.json", JSON.stringify(runs, null, 2) + "\n"); }
