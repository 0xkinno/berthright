"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { runChecks, type Check as C } from "@/lib/proof";

export function ProofRunner() {
  const [r, setR] = useState<{ checks: C[]; block: number | null; at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const go = useCallback(async () => { setBusy(true); try { setR(await runChecks()); } finally { setBusy(false); } }, []);
  useEffect(() => { go(); }, [go]);
  const passed = r?.checks.filter((c) => c.ok).length ?? 0;
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn btn-lemon" onClick={go} disabled={busy}><RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden /> Recheck from chain</button>
        {r && <p className="mono text-[15px]">{passed} of {r.checks.length} checks pass · block {r.block ?? "-"} · {r.at}</p>}
      </div>
      <ul className="mt-6 space-y-3">
        {r?.checks.map((c) => (
          <li key={c.id} className="card flex gap-4 p-5">
            <span role="img" aria-label={c.ok ? "pass" : "fail"} className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-[color:var(--signal)] text-white" : "bg-[color:var(--mayday)] text-white"}`}>{c.ok ? <Check size={15} /> : <X size={15} />}</span>
            <div className="min-w-0"><p className="font-semibold">{c.claim}</p><p className="mono mt-1 break-all text-[13px] text-[color:var(--slate)]">{c.detail}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
