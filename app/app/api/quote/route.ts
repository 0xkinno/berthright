import { NextResponse } from "next/server";
import { dryQuote, DESTINATIONS } from "@/lib/intents";

export const dynamic = "force-dynamic";

// A live quote for turning an allotment into stablecoin on another chain. Quote only:
// Intents runs on mainnet and Berthright's money loop runs on testnet.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const amount = u.searchParams.get("amount") ?? "200000000";
  const dest = (u.searchParams.get("dest") ?? "base") as keyof typeof DESTINATIONS;
  if (!/^\d{1,20}$/.test(amount) || !DESTINATIONS[dest]) return NextResponse.json({ ok: false, reason: "amount must be base units; dest one of base, arb, near" }, { status: 400 });
  if (process.env.BERTHRIGHT_FAULT === "quote_down") return NextResponse.json({ ok: false, reason: "Fault switch on: the quote service is marked down. Nothing was asked." }, { status: 503 });
  try {
    const q = await dryQuote({ amount, dest });
    return NextResponse.json({ ok: true, label: "Quote only. Intents runs on mainnet.", ...q });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `The Intents quote service did not give a quote: ${(e as Error).message}` }, { status: 502 });
  }
}
