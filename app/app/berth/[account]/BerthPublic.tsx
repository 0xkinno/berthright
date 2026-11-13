"use client";
import { useState } from "react";
import { ExternalLink, Lock, Unlock } from "lucide-react";
import { useBerth } from "@/components/useBerth";
import { useSession } from "@/components/Session";
import { explorerAccount, IDS } from "@/lib/config";
import { sign413 } from "@/lib/near";
import { tusd, nsToDate, short } from "@/lib/format";

export function BerthPublic({ account }: { account: string }) {
  const d = useBerth(account);
  const { wallet, judge } = useSession();
  const [notices, setNotices] = useState<any | null>(null);
  const [gateMsg, setGateMsg] = useState<string | null>(null);

  async function unlock() {
    setGateMsg(null);
    try {
      const message = `Open crew notices for ${account} at ${new Date().toISOString()}`;
      const who = wallet ? ({ kind: "wallet" } as const) : judge ? ({ kind: "browser", accountId: judge.crew.accountId, secretKey: judge.crew.secretKey } as const) : null;
      if (!who) { setGateMsg("Connect the wallet that holds this berth, or run the judge flow first."); return; }
      const signed = await sign413(message, who);
      const r = await fetch("/api/notices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...signed, berth: account }) });
      const j = await r.json();
      if (!j.ok) setGateMsg(j.reason); else setNotices(j);
    } catch (e) { setGateMsg((e as Error).message); }
  }

  const b = d.berth;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">Berth · public record</p>
      <h1 className="mono mt-3 break-all text-[26px] sm:text-[34px]">{account}</h1>
      <div className="mt-3 flex flex-wrap gap-3 text-[14px]">
        <a className="inline-flex min-h-11 items-center gap-1 underline" href={explorerAccount(account)}>Explorer <ExternalLink size={14} aria-hidden /></a>
        {b && <a className="inline-flex min-h-11 items-center underline" href={`/ship/${b.ship_id}`}>Ship #{b.ship_id}</a>}
        <a className="inline-flex min-h-11 items-center underline" href={`/family/${d.allotment?.receiver ?? ""}`} aria-disabled={!d.allotment}>Family view</a>
      </div>
      {d.error && <p role="alert" className="mt-6 rounded-xl border border-[color:var(--mayday)] p-4 text-[color:var(--mayday)]">{d.error}</p>}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="card p-6">
          <p className="eyebrow">The NFT, read at one block</p>
          {d.pinned ? (
            <dl className="mt-3 space-y-1 text-[14px]">
              <div className="flex justify-between gap-3"><dt>Holder</dt><dd className="mono">{short(d.pinned.item.owner_id, 24)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Registry says</dt><dd className="mono">{short(d.pinned.token?.owner_id, 24)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Agree</dt><dd className={d.pinned.agree ? "text-[color:var(--signal)]" : "text-[color:var(--mayday)]"}>{d.pinned.agree ? "yes" : "no: refuse"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Status</dt><dd className="mono">{d.pinned.item.status}</dd></div>
              <div className="flex justify-between gap-3"><dt>Rotation</dt><dd className="mono">{d.pinned.item.rotation_seq}</dd></div>
              <div className="flex justify-between gap-3"><dt>Block</dt><dd className="mono">{d.pinned.block.height}</dd></div>
            </dl>
          ) : <p className="mt-3 text-[14px] text-[color:var(--slate)]">{d.loading ? "Reading..." : "This account does not answer nft_item_info: it is not a berth."}</p>}
        </div>
        <div className="card p-6">
          <p className="eyebrow">Money</p>
          <p className="mono mt-3 text-[30px]">{tusd(d.inBerth)} <span className="text-[16px]">tUSD in the berth</span></p>
          {b && <dl className="mt-3 space-y-1 text-[14px]">
            <div className="flex justify-between"><dt>Earned this stint</dt><dd className="mono">{tusd(b.earned)}</dd></div>
            <div className="flex justify-between"><dt>Paid to the berth</dt><dd className="mono">{tusd(b.paid_to_berth)}</dd></div>
            <div className="flex justify-between"><dt>Paid to own account</dt><dd className="mono">{tusd(b.paid_to_holder)}</dd></div>
            <div className="flex justify-between"><dt>Reserve locked</dt><dd className="mono">{tusd(b.reserve)}</dd></div>
            <div className="flex justify-between"><dt>Unpaid</dt><dd className="mono">{tusd(b.arrears)}</dd></div>
          </dl>}
        </div>
        <div className="card p-6">
          <p className="eyebrow">Allotment</p>
          {d.allotment ? (
            <dl className="mt-3 space-y-1 text-[14px]">
              <div className="flex justify-between gap-3"><dt>To</dt><dd className="mono">{short(d.allotment.receiver, 22)}</dd></div>
              <div className="flex justify-between"><dt>Each time</dt><dd className="mono">{tusd(d.allotment.amount)}</dd></div>
              <div className="flex justify-between"><dt>Sent so far</dt><dd className="mono">{tusd(d.allotment.sent_total)}</dd></div>
              <div className="flex justify-between gap-3"><dt>State</dt><dd className="mono">{d.allotment.stopped ?? "running"}</dd></div>
            </dl>
          ) : <p className="mt-3 text-[14px] text-[color:var(--slate)]">No allotment set.</p>}
        </div>
      </div>

      <section className="mt-10" aria-labelledby="record">
        <h2 id="record" className="display text-[32px] font-bold">Sea-service record</h2>
        <p className="mt-2 text-[15px] text-[color:var(--slate)]">Kept by the wage chest, last {64} entries. Every line is backed by a transaction on testnet.</p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead><tr className="border-b border-[color:var(--hair)]"><th className="p-3">Event</th><th className="p-3">Holder</th><th className="p-3">From</th><th className="p-3">At</th><th className="p-3 text-right">Earned</th><th className="p-3 text-right">Paid</th></tr></thead>
            <tbody>
              {d.history.length === 0 && <tr><td className="p-3 text-[color:var(--slate)]" colSpan={6}>No entries yet.</td></tr>}
              {d.history.map((h, i) => (
                <tr key={i} className="ledger-row">
                  <td className="p-3 font-semibold">{h.kind.replace("_", " ")}</td>
                  <td className="mono p-3">{short(h.holder, 26)}</td>
                  <td className="mono p-3">{nsToDate(h.from_ns)}</td>
                  <td className="mono p-3">{nsToDate(h.at_ns)}</td>
                  <td className="mono p-3 text-right">{tusd(h.earned)}</td>
                  <td className="mono p-3 text-right">{tusd(h.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="notices">
        <h2 id="notices" className="display text-[32px] font-bold">Crew-only notices</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-[color:var(--slate)]">Only the current holder can open these. You sign a message (NEP-413) with your own account; the server checks the signature, that the key is yours, and that the berth names you as its holder at one block.</p>
        {notices ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {notices.notices.map((n: any) => <li key={n.title} className="card p-5"><p className="font-semibold">{n.title}</p><p className="mt-1 text-[15px] text-[color:var(--slate)]">{n.body}</p></li>)}
            <li className="mono text-[12px] text-[color:var(--slate)]">Opened for {notices.holder} at block {notices.block}, rotation {notices.rotation_seq}.</li>
          </ul>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" className="btn btn-ink" onClick={unlock}><Lock size={16} aria-hidden /> Sign in as the holder</button>
            {gateMsg && <p role="alert" className="text-[15px] text-[color:var(--mayday)]"><Unlock size={14} className="mr-1 inline" aria-hidden />{gateMsg}</p>}
          </div>
        )}
      </section>
      <p className="mono mt-8 text-[12px] text-[color:var(--slate)]">Collection: {IDS.registry || "not deployed"} · Namespace: {IDS.registrar || "not deployed"}</p>
    </div>
  );
}
