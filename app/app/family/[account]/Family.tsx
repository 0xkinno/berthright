"use client";
import { useEffect, useState } from "react";
import { IDS, DEPLOYED } from "@/lib/config";
import { view } from "@/lib/near";
import { tusd } from "@/lib/format";

export function Family({ account }: { account: string }) {
  const [bal, setBal] = useState<string | null>(null);
  const [dest, setDest] = useState("base");
  const [q, setQ] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!DEPLOYED) { setErr("The contracts are not deployed to testnet yet."); return; }
    view<string>(IDS.tusd, "ft_balance_of", { account_id: account }, { ttlMs: 0 }).then(setBal).catch((e) => setErr(e.message));
  }, [account]);
  async function quote() {
    setQ({ loading: true });
    const amount = bal && BigInt(bal) > 0n ? bal : "200000000";
    const r = await fetch(`/api/quote?amount=${amount}&dest=${dest}`);
    setQ(await r.json());
  }
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <p className="eyebrow">For family</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[52px]">Allotments received</h1>
      <p className="mono mt-3 break-all text-[15px]">{account}</p>
      {err && <p role="alert" className="mt-4 rounded-xl border border-[color:var(--mayday)] p-4 text-[color:var(--mayday)]">{err}</p>}
      <div className="card mt-8 p-6">
        <p className="eyebrow">Received so far</p>
        <p className="mono mt-2 text-[44px] leading-none">{bal === null ? "-" : tusd(bal)} <span className="text-[18px]">tUSD</span></p>
        <p className="mt-2 text-[14px] text-[color:var(--slate)]">Test dollars on NEAR testnet, sent by the berth&apos;s allotment through the crew member&apos;s spend grant.</p>
      </div>
      <div className="card mt-6 p-6">
        <p className="eyebrow">Cash out to another chain · live quote</p>
        <p className="mt-2 text-[15px]">What the same amount of real USDC on NEAR would become on another chain through NEAR Intents, right now.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="dest">Destination</label>
          <select id="dest" value={dest} onChange={(e) => setDest(e.target.value)} className="min-h-12 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4">
            <option value="base">USDC on Base</option>
            <option value="arb">USDC on Arbitrum</option>
          </select>
          <button type="button" className="btn btn-lemon" onClick={quote}>Get quote</button>
        </div>
        {q?.loading && <p className="mt-3 text-[14px]">Asking 1Click...</p>}
        {q && !q.loading && (q.ok ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
            <div><dt className="text-[color:var(--slate)]">You send</dt><dd className="mono">{q.quote.amountInFormatted} USDC</dd></div>
            <div><dt className="text-[color:var(--slate)]">Family receives</dt><dd className="mono">{q.quote.amountOutFormatted} on {q.destination.replace("USDC on ", "")}</dd></div>
            <div><dt className="text-[color:var(--slate)]">Time</dt><dd className="mono">about {q.quote.timeEstimate}s</dd></div>
            <div><dt className="text-[color:var(--slate)]">Fee basis</dt><dd className="mono">{q.jwt ? "partner key" : "public (0.2% without key)"}</dd></div>
            <p className="col-span-2 rounded-xl bg-[color:var(--ink)] p-3 text-[14px] font-semibold text-[color:var(--lemon)]">{q.label}</p>
          </dl>
        ) : <p role="alert" className="mt-3 text-[color:var(--mayday)]">{q.reason}</p>)}
      </div>
    </div>
  );
}
