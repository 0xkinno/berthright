"use client";
import { useState } from "react";

const PARTS = [
  { id: "name", label: "The name", where: "registrar", text: "ab2-kestrel.crew.berthright.testnet is a real NEAR account, created by the crew namespace's registrar. The wage chest pays this address; the family recognises it; the record attaches to it." },
  { id: "nft", label: "The NFT", where: "tla-registry, NEP-171", text: "The same name is a token in the House of Stake registry. Whoever holds it is the crew member in that berth. Crew change is a token transfer." },
  { id: "keys", label: "No keys", where: "hos-wallet", text: "The account holds no access key. Only its holder acts on it, from their own account, through w_execute_extension. Nobody can bolt a key on, not even the shipowner." },
  { id: "lease", label: "The lease", where: "hos_lease", text: "A fixed lease term, longer than the crewing contract. House of Stake cannot move a live lease without the holder asking." },
  { id: "grant", label: "The grant", where: "hos_grant_spend", text: "The allotment home: named receivers, a token budget, an expiry. NEAR's audited wallet code enforces the fence; a hand-over wipes it." },
  { id: "record", label: "The record", where: "portage.berth_history", text: "Who held the berth, from when to when, what they earned and what was paid. A sea-service record the seafarer can show." },
];

export function Anatomy() {
  const [active, setActive] = useState("name");
  const p = PARTS.find((x) => x.id === active)!;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="rounded-2xl border-2 border-[color:var(--ink)] bg-[color:var(--paper)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">Berth plate</span>
            <span className="pill bg-[color:var(--ink)] text-[color:var(--lemon)]">Signed on</span>
          </div>
          <p className="mono mt-4 break-all text-[17px] sm:text-[20px]">ab2-kestrel<span className="text-[color:var(--slate)]">.crew.berthright.testnet</span></p>
          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3" role="tablist" aria-label="Parts of a berth">
            {PARTS.map((x) => (
              <li key={x.id} role="presentation">
                <button
                  role="tab"
                  aria-selected={active === x.id}
                  onMouseEnter={() => setActive(x.id)}
                  onFocus={() => setActive(x.id)}
                  onClick={() => setActive(x.id)}
                  className={`min-h-12 w-full rounded-xl border px-3 text-left text-[14px] font-medium transition ${active === x.id ? "border-[color:var(--ink)] bg-[color:var(--lemon)]" : "border-[color:var(--hair)] bg-[color:var(--paper-hi)] hover:border-[color:var(--ink)]"}`}
                >
                  {x.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div role="tabpanel" aria-live="polite" className="lg:pt-6">
        <p className="eyebrow">{p.where}</p>
        <h3 className="display mt-2 text-[32px] font-bold leading-tight">{p.label}</h3>
        <p className="mt-4 text-[18px] leading-relaxed text-[color:var(--slate)]">{p.text}</p>
      </div>
    </div>
  );
}
