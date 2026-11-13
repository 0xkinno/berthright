"use client";
import { ExternalLink } from "lucide-react";
import { explorerTx } from "@/lib/config";
import { decode } from "@/lib/codes";

export interface TxRecord { label: string; hash: string; ok: boolean; failure?: string | null; at: string }

export function TxList({ items }: { items: TxRecord[] }) {
  if (!items.length) return null;
  return (
    <ol className="mt-4 space-y-2" aria-label="Transactions">
      {items.map((t, i) => {
        const d = decode(t.failure);
        return (
          <li key={i} className={`rounded-xl border p-3 text-[14px] ${t.ok ? "border-[color:var(--hair)] bg-[color:var(--paper)]" : "border-[color:var(--mayday)]/50 bg-[#f8ebe4]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{t.label}</span>
              {t.hash ? (
                <a href={explorerTx(t.hash)} target="_blank" rel="noreferrer" className="mono inline-flex min-h-9 items-center gap-1 underline">
                  {t.hash.slice(0, 10)}... <ExternalLink size={13} aria-hidden /><span className="sr-only">(opens explorer)</span>
                </a>
              ) : null}
            </div>
            {!t.ok && (
              <p className="mt-1 text-[color:var(--mayday)]"><span className="mono">{d.code ?? "refused"}</span>{d.words && d.words !== d.code ? `: ${d.words}` : ""}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
