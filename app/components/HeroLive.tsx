"use client";
import { useEffect, useState } from "react";
import { tusd } from "@/lib/format";

export function HeroLive() {
  const [s, setS] = useState<any | null>(null);
  useEffect(() => { fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => setS({ ok: false })); }, []);
  if (!s) return <p className="mono text-[13px] text-[color:var(--slate)]">Reading NEAR testnet...</p>;
  if (!s.ok) return <p className="mono text-[13px] text-[color:var(--mayday)]">Testnet did not answer just now.</p>;
  return (
    <p className="flex items-start gap-2.5 text-[14px] leading-snug text-[color:var(--slate)]">
      <span aria-hidden className="relative mt-1 inline-flex h-2.5 w-2.5 shrink-0"><span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--signal-bright)] opacity-60 motion-reduce:hidden" /><span className="relative h-2.5 w-2.5 rounded-full bg-[color:var(--signal-bright)]" /></span>
      <span>Live on NEAR testnet: {s.berths_signed} crew signed on · {tusd(s.reserved, 0)} tUSD locked as reserves · {tusd(s.paid_total, 0)} tUSD paid</span>
    </p>
  );
}
