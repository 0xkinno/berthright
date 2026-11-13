// Completes the hand-over break item: cadet signs on, signs off, hands the berth to the relief,
// then the cadet's old allotment is run and must stop.
import { readFileSync, writeFileSync } from "node:fs";
import { account, call, view, readDeployment, ONE_YOCTO, refusal, explorerTx } from "../lib/near.ts";
const d = readDeployment();
const runs = JSON.parse(readFileSync("data/runs.json", "utf8"));
const b = `cadet-kestrel.${d.registrar}`;
const cadet = account(`cadet.${d.root}`), stranger = account(`stranger.${d.root}`), relief = `relief.${d.root}`;
const SEA = "5e1b3c2a"; // unused
const v: any = await view(d.portage, "get_berth", { berth: b });
const ship: any = await view(d.portage, "get_ship", { ship_id: v.ship_id });
console.log("berth", v.status, "ship free", ship.unreserved, "reserve needed", v.reserve_needed);
if (v.status !== "Signed") {
  const r = await call(cadet, d.portage, "sign_on", { berth: b, confirmed_daily_wage: v.daily_wage, sea_hash: v.sea_hash }, { gasT: 100 });
  console.log("sign_on", r.ok, refusal(r.logs, r.failure), explorerTx(r.hash));
}
const off = await call(cadet, d.portage, "sign_off", { berth: b }, { gasT: 100 });
console.log("sign_off", off.ok, refusal(off.logs, off.failure), explorerTx(off.hash));
const hand = await call(cadet, d.registry, "nft_transfer", { receiver_id: relief, token_id: b }, { deposit: ONE_YOCTO, gasT: 140 });
console.log("nft_transfer", hand.ok, hand.failure?.slice(0, 160), explorerTx(hand.hash));
const item: any = await view(b, "nft_item_info");
console.log("owner now", item.owner_id, "rotation", item.rotation_seq);
const run = await call(stranger, d.allotment, "run", { berth: b }, { gasT: 250 });
console.log("old allotment run ->", run.value, explorerTx(run.hash));
runs.hand_over = { sign_off: off.hash, nft_transfer: hand.hash, ok: off.ok && hand.ok, new_owner: item.owner_id, rotation_seq: item.rotation_seq };
runs.break.old_holder_allotment = { label: "The old holder's allotment after hand-over", hash: run.hash, refused: run.value !== "sent", decoded: String(run.value), at: new Date().toISOString() };
writeFileSync("data/runs.json", JSON.stringify(runs, null, 2) + "\n");
