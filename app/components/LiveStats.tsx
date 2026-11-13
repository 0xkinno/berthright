"use client";
import { useEffect, useState } from "react";
import { tusd } from "@/lib/format";

type Stats = { ok: boolean; reason?: string; ships?: number; berths_signed?: number; paid_total?: string; reserved?: string; allotments_sent?: string; allotment_runs?: number; measured_at?: string };

export function LiveStats() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => setS({ ok: false, reason: "The stats service did not answer." }));
  }, []);
  if (!s) return <p className="mono text-[14px] text-[color:var(--slate)]">Reading the chain...</p>;
  if (!s.ok) return <p className="rounded-xl border border-[color:var(--mayday)] p-4 text-[15px] text-[color:var(--mayday)]">{s.reason}</p>;
  const items = [
    ["Ships", String(s.ships ?? 0)],
    ["Crew signed on", String(s.berths_signed ?? 0)],
    ["Locked as reserves", `${tusd(s.reserved)} tUSD`],
    ["Wages paid", `${tusd(s.paid_total)} tUSD`],
    ["Allotments sent", `${tusd(s.allotments_sent)} tUSD`],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="mono mt-2 text-[20px]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mono mt-2 text-[12px] text-[color:var(--slate)]">Read from testnet at {s.measured_at}</p>
    </div>
  );
}
