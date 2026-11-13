import { NextResponse } from "next/server";
import { readSea } from "@/lib/nearai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (process.env.BERTHRIGHT_FAULT === "ai_down") return NextResponse.json({ ok: false, reason: "Contract reading is unavailable (fault switch on); type the wage from your contract." }, { status: 503 });
  if (!process.env.NEARAI_API_KEY) return NextResponse.json({ ok: false, reason: "Contract reading is unavailable; type the wage from your contract." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ ok: false, reason: "Send a photo of the contract." }, { status: 400 });
  if (file.size > 4_000_000) return NextResponse.json({ ok: false, reason: "The photo is larger than 4 MB." }, { status: 413 });
  try {
    const r = await readSea(Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `Contract reading failed: ${(e as Error).message.slice(0, 160)}. Type the wage from your contract.` }, { status: 502 });
  }
}
