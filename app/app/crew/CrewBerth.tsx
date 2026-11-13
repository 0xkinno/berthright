"use client";
import { useEffect, useState } from "react";
import { Snowflake, Sun, Send, LogOut, Anchor, FileText } from "lucide-react";
import { useSession } from "@/components/Session";
import { useBerth } from "@/components/useBerth";
import { TxList, type TxRecord } from "@/components/TxList";
import { DEMO, IDS } from "@/lib/config";
import { tx, signOffAndHandOver, sha256hex, SAMPLE_SEA_TEXT } from "@/lib/actions";
import { tusd, toBase, secs, short } from "@/lib/format";
import type { TxSpec } from "@/lib/near";

export function CrewBerth() {
  const { wallet, judge, signerFor } = useSession();
  const [berthId, setBerthId] = useState("");
  const [log, setLog] = useState<TxRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [wage, setWage] = useState("");
  const [seaText, setSeaText] = useState(SAMPLE_SEA_TEXT);
  const [seaFileHash, setSeaFileHash] = useState<string | null>(null);
  const [reader, setReader] = useState<any | null>(null);
  const [allotTo, setAllotTo] = useState("");
  const [allotAmt, setAllotAmt] = useState("5");
  const [relief, setRelief] = useState("");

  useEffect(() => { if (!berthId) setBerthId(judge?.berth ?? DEMO?.berths?.[0] ?? ""); }, [judge, berthId]);
  const d = useBerth(berthId || null);
  const me = wallet?.accountId ?? judge?.crew.accountId ?? null;
  const b = d.berth;
  const holder = d.pinned?.item.owner_id;
  const isHolder = !!me && holder === me;
  const months = b ? Number(BigInt(b.reserve_needed) - BigInt(d.ship?.repatriation_allowance ?? 0)) / Number(BigInt(b.daily_wage) * 30n) : 0;

  async function go(label: string, specs: TxSpec[]) {
    setBusy(true);
    try {
      const s = await signerFor("crew");
      if (!s) { setLog((l) => [...l, { label, hash: "", ok: false, failure: "Connect a wallet, or run the judge flow to get a browser key.", at: "" }]); return; }
      const out = await s.send(specs);
      out.forEach((o, i) => setLog((l) => [...l, { label: specs.length > 1 ? `${label} (${i + 1}/${specs.length})` : label, hash: o.hash, ok: o.ok, failure: o.failure, at: new Date().toISOString() }]));
    } catch (e) {
      setLog((l) => [...l, { label, hash: "", ok: false, failure: (e as Error).message, at: "" }]);
    } finally { setBusy(false); d.reload(); }
  }

  async function readContract(file: File) {
    const buf = await file.arrayBuffer();
    setSeaFileHash(await sha256hex(buf));
    const form = new FormData();
    form.append("photo", file);
    const r = await fetch("/api/sea", { method: "POST", body: form });
    setReader(await r.json());
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">For crew · phone first</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[56px]">Your berth</h1>
      <label className="mt-6 block max-w-xl text-[14px] font-medium" htmlFor="berth">Berth account</label>
      <input id="berth" value={berthId} onChange={(e) => setBerthId(e.target.value.trim())} placeholder={`name.${IDS.registrar || "crew.berthright.testnet"}`} className="mono mt-1 min-h-12 w-full max-w-xl rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper-hi)] px-4 text-[15px]" />
      <p className="mt-2 text-[14px] text-[color:var(--slate)]">Acting as: <span className="mono">{me ?? "nobody yet (connect, or start the judge run)"}</span></p>
      {d.error && <p role="alert" className="mt-4 rounded-xl border border-[color:var(--mayday)] p-4 text-[color:var(--mayday)]">{d.error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <section aria-label="Berth card" className="overflow-hidden rounded-[28px] bg-[color:var(--ink)] p-6 text-[color:var(--paper-hi)] shadow-xl">
          <div className="flex items-center justify-between">
            <span className="eyebrow !text-[color:var(--brass-soft)]">On board now</span>
            <span className={`pill ${b?.status === "Signed" ? "bg-[color:var(--lemon)] text-[color:var(--ink)]" : b?.status === "Released" ? "bg-[color:var(--signal-bright)] text-[color:var(--ink)]" : "bg-white/10"}`}>{b?.status ?? "No berth"}</span>
          </div>
          <p className="mono mt-3 text-[40px] leading-none text-[color:var(--lemon)]">{tusd(d.inBerth)}</p>
          <p className="mono text-[14px] text-[#c9c6b6]">tUSD in {short(berthId, 30)}</p>
          <div className="mt-6">
            <div className="flex justify-between text-[13px]"><span>Guaranteed</span><span className="mono">{b ? `${months.toFixed(1)} months + fare home` : "-"}</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Guarantee locked" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b && BigInt(b.reserve) > 0n ? 100 : 0}>
              <div className="h-full rounded-full bg-[color:var(--lemon)]" style={{ width: b && BigInt(b.reserve) > 0n ? "100%" : "0%" }} />
            </div>
            <p className="mt-2 text-[13px] text-[#c9c6b6]">Covered on board: 4 months. Not covered: anything beyond that.</p>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-[14px]">
            <div><dt className="text-[#c9c6b6]">Daily wage</dt><dd className="mono">{b ? tusd(b.daily_wage) : "-"}</dd></div>
            <div><dt className="text-[#c9c6b6]">Next whole unit in</dt><dd className="mono">{d.quote && b?.status === "Signed" ? secs(Number(d.quote.secs_to_next_unit)) : "-"}</dd></div>
            <div><dt className="text-[#c9c6b6]">Due to settle</dt><dd className="mono">{d.quote ? tusd(d.quote.due_now) : "-"}</dd></div>
            <div><dt className="text-[#c9c6b6]">Unpaid</dt><dd className={`mono ${b && BigInt(b.arrears) > 0n ? "text-[#ff9b7a]" : ""}`}>{b ? tusd(b.arrears) : "-"}</dd></div>
            <div className="col-span-2"><dt className="text-[#c9c6b6]">Allotment</dt><dd className="mono">{d.allotment ? `${tusd(d.allotment.amount)} to ${short(d.allotment.receiver, 20)} · ${d.allotment.stopped ?? "running"}` : "none"}</dd></div>
            <div className="col-span-2"><dt className="text-[#c9c6b6]">Berth status (wallet)</dt><dd className="mono">{d.pinned?.item.status ?? "-"} · holder {short(holder, 22)}</dd></div>
          </dl>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" className="btn bg-white/10 text-white hover:bg-white/15" disabled={busy || !isHolder || !b} onClick={() => go("Settle my wages", [tx.settle(berthId)])}><Anchor size={16} aria-hidden /> Settle</button>
            {d.pinned?.item.status === "Frozen"
              ? <button type="button" className="btn bg-white/10 text-white hover:bg-white/15" disabled={busy || !isHolder} onClick={() => go("Unfreeze the berth", [tx.unfreeze(berthId)])}><Sun size={16} aria-hidden /> Unfreeze</button>
              : <button type="button" className="btn bg-white/10 text-white hover:bg-white/15" disabled={busy || !isHolder} onClick={() => go("Freeze the berth", [tx.freeze(berthId)])}><Snowflake size={16} aria-hidden /> Freeze</button>}
          </div>
          {b?.status === "Released" && <p className="mt-4 rounded-xl bg-[color:var(--signal-bright)] p-3 text-[14px] font-semibold text-[color:var(--ink)]">Guarantee released: {tusd(b.paid_to_holder)} tUSD went to your own account.</p>}
          {d.coverage && BigInt(d.coverage.arrears) > 0n && b?.status === "Signed" && <p className="mt-4 rounded-xl bg-[color:var(--mayday)] p-3 text-[14px] font-semibold">Wages are late. If still unpaid in {d.coverage.grace_left_secs}s of ship time, anyone can release your guarantee.</p>}
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="signon">
            <h2 id="signon" className="display text-[26px] font-bold">Sign on</h2>
            <p className="mt-1 text-[15px] text-[color:var(--slate)]">Confirm the wage from your own contract. A model may read a photo and suggest numbers; you decide. Only a hash of your contract goes on chain.</p>
            <label className="mt-4 block text-[14px] font-medium" htmlFor="sea">Contract text (or upload a photo below)</label>
            <textarea id="sea" value={seaText} onChange={(e) => { setSeaText(e.target.value); setSeaFileHash(null); }} rows={3} className="mt-1 w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] p-3 text-[14px]" />
            <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-medium underline"><FileText size={16} aria-hidden /> Upload contract photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && readContract(e.target.files[0])} /></label>
            {reader && (
              <div className="mt-3 rounded-xl border border-[color:var(--hair)] p-3 text-[14px]">
                {!reader.ok ? <p className="text-[color:var(--mayday)]">{reader.reason}</p> : (
                  <ul className="space-y-1">{Object.entries(reader.fields).map(([k, v]: any) => <li key={k} className="flex justify-between gap-3"><span>{k.replace(/_/g, " ")}</span><span className="mono">{String(v.value ?? "-")} · <b className={v.state === "OBSERVED" ? "text-[color:var(--signal)]" : v.state === "REVIEW" ? "text-[color:var(--brass)]" : "text-[color:var(--mayday)]"}>{v.state}</b></span></li>)}</ul>
                )}
              </div>
            )}
            <label className="mt-4 block text-[14px] font-medium" htmlFor="wage">Daily wage in your contract (tUSD)</label>
            <input id="wage" inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} placeholder={b ? tusd(b.daily_wage) : "10.00"} className="mono mt-1 min-h-12 w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4" />
            <button type="button" className="btn btn-lemon mt-4" disabled={busy || !b || !wage} onClick={async () => {
              const hash = seaFileHash ?? (await sha256hex(seaText));
              await go("Register me for test dollars, then sign on", [tx.register(me!), tx.signOn(berthId, toBase(wage), hash)]);
            }}>Sign on</button>
          </section>

          <section className="card p-6" aria-labelledby="allot">
            <h2 id="allot" className="display text-[26px] font-bold">Allotment home</h2>
            <p className="mt-1 text-[15px] text-[color:var(--slate)]">One approval: add the allotment contract to your berth, fence it to one receiver and a budget, and set the schedule. Your berth&apos;s own wallet code enforces the fence.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
              <input aria-label="Receiver account" value={allotTo} onChange={(e) => setAllotTo(e.target.value.trim())} placeholder="mother.testnet" className="mono min-h-12 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4" />
              <input aria-label="Amount each time (tUSD)" inputMode="decimal" value={allotAmt} onChange={(e) => setAllotAmt(e.target.value)} className="mono min-h-12 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4" />
            </div>
            <button type="button" className="btn btn-ink mt-4" disabled={busy || !isHolder || !allotTo} onClick={() => {
              const amount = toBase(allotAmt);
              const budget = (BigInt(amount) * 12n).toString();
              const expires = (BigInt(Date.now()) * 1_000_000n + 365n * 86_400n * 1_000_000_000n).toString();
              go("Set up the allotment", [tx.register(allotTo), tx.addExtension(berthId), tx.grantSpend(berthId, allotTo, budget, expires), tx.setAllotment(berthId, allotTo, amount, 60)]);
            }}><Send size={16} aria-hidden /> Fence and send</button>
            {d.allotment && <button type="button" className="btn btn-outline ml-2 mt-4" disabled={busy} onClick={() => go("Run the allotment now", [tx.runAllotment(berthId)])}>Run now</button>}
          </section>

          <section className="card p-6" aria-labelledby="off">
            <h2 id="off" className="display text-[26px] font-bold">Sign off and hand over</h2>
            <p className="mt-1 text-[15px] text-[color:var(--slate)]">Final wages go to your own account; anything left in the berth comes to you; then the berth NFT goes to your relief. Tokens in a berth pass with it, so we empty it first, in the same approval.</p>
            <input aria-label="Relief's account" value={relief} onChange={(e) => setRelief(e.target.value.trim())} placeholder="relief.testnet" className="mono mt-4 min-h-12 w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4" />
            <button type="button" className="btn btn-outline mt-4" disabled={busy || !isHolder || !relief || b?.status !== "Signed"} onClick={() => go("Sign off and hand over", signOffAndHandOver(berthId, me!, relief, d.inBerth))}><LogOut size={16} aria-hidden /> Sign off and hand over</button>
          </section>
          <TxList items={log} />
        </div>
      </div>
    </div>
  );
}
