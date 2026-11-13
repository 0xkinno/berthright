import { view, readDeployment } from "../lib/near.ts";
const d = readDeployment();
const s: any = await view(d.portage, "get_ship", { ship_id: "0" });
console.log("ship", { free: s.unreserved, reserved: s.reserved, payable: s.payable, arrears: s.arrears, funded: s.funded_total, paid: s.paid_total });
for (const b of s.berths) {
  const v: any = await view(d.portage, "get_berth", { berth: b });
  const a: any = await view(d.allotment, "get_allotment", { berth: b });
  const it: any = await view(b, "nft_item_info");
  console.log(b.split(".")[0], v.status, "holder", it.owner_id.split(".")[0], "seq", it.rotation_seq, "allot", a ? `${a.receiver.split(".")[0]} ${a.amount} sent ${a.sent_total} stopped ${a.stopped}` : "none", "inBerth", await view(d.tusd, "ft_balance_of", { account_id: b }));
}
