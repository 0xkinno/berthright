import { NextResponse } from "next/server";
import { runChecks } from "@/lib/proof";
export const dynamic = "force-dynamic";
export async function GET() {
  const r = await runChecks();
  return NextResponse.json({ ...r, passed: r.checks.filter((c) => c.ok).length, total: r.checks.length });
}
