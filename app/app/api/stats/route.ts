import { NextResponse } from "next/server";
import { IDS, DEPLOYED } from "@/lib/config";
import { view } from "@/lib/near";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!DEPLOYED) return NextResponse.json({ ok: false, reason: "The contracts are not deployed to testnet yet, so there is nothing on chain to count." });
  try {
    const count = Number(await view<string>(IDS.portage, "ship_count", {}, { ttlMs: 0 }));
    const ships: any[] = [];
    for (let from = 0; from < count; from += 50) ships.push(...(await view<any[]>(IDS.portage, "list_ships", { from_index: String(from), limit: 50 }, { ttlMs: 0 })));
    let reserved = 0n, paid = 0n, signed = 0;
    const seen = new Set<number>();
    for (const s of ships) {
      if (seen.has(Number(s.ship_id))) continue;
      seen.add(Number(s.ship_id));
      reserved += BigInt(s.reserved);
      paid += BigInt(s.paid_total);
      for (const b of s.berths as string[]) {
        if (signed > 400) break;
        const v = await view<any>(IDS.portage, "get_berth", { berth: b }, { ttlMs: 0 });
        if (v?.status === "Signed") signed++;
      }
    }
    const a = await view<any>(IDS.allotment, "stats", {}, { ttlMs: 0 });
    return NextResponse.json({
      ok: true,
      ships: seen.size,
      berths_signed: signed,
      reserved: reserved.toString(),
      paid_total: paid.toString(),
      allotments_sent: a.total_sent,
      allotment_runs: Number(a.total_runs),
      measured_at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Testnet did not answer: ${(e as Error).message.slice(0, 160)}` });
  }
}
