"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Printer, PlusCircle } from "lucide-react";
import { IDS, DEPLOYED } from "@/lib/config";
import { view, RpcDown, type TxSpec } from "@/lib/near";
import { tx } from "@/lib/actions";
import { tusd, toBase, months, short, nsToDate } from "@/lib/format";
import { useSession } from "@/components/Session";
import { TxList, type TxRecord } from "@/components/TxList";

export function ShipView({ id }: { id: string }) {
  const { signerFor } = useSession();
  const [ship, setShip] = useState<any | null>(null);
  const [cov, setCov] = useState<any | null>(null);
  const [bill, setBill] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [amt, setAmt] = useState("100");
  const [log, setLog] = useState<TxRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!DEPLOYED) { setError("The contracts are not deployed to testnet yet."); return; }
    try {
      const [s, c, b] = await Promise.all([
        view<any>(IDS.portage, "get_ship", { ship_id: id }, { ttlMs: 0 }),
        view<any>(IDS.portage, "coverage", { ship_id: id }, { ttlMs: 0 }).catch(() => null),
        view<any[]>(IDS.portage, "portage_bill", { ship_id: id }, { ttlMs: 0 }).catch(() => []),
      ]);
      setShip(s); setCov(c); setBill(b ?? []); setError(s ? null : "No ship with this number.");
    } catch (e) { setError(e instanceof RpcDown ? "Testnet RPC is not answering right now." : (e as Error).message.slice(0, 160)); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function go(label: string, specs: TxSpec[]) {
    setBusy(true);
    try {
      const s = await signerFor("owner");
      if (!s) { setLog((l) => [...l, { label, hash: "", ok: false, failure: "Connect the shipowner's wallet, or run the judge flow.", at: "" }]); return; }
      const out = await s.send(specs);
      out.forEach((o) => setLog((l) => [...l, { label, hash: o.hash, ok: o.ok, failure: o.failure, at: new Date().toISOString() }]));
    } finally { setBusy(false); load(); }
  }

  function csv() {
    const head = ["berth", "holder", "status", "days", "daily_wage_tusd", "earned_tusd", "paid_to_berth_tusd", "paid_to_own_account_tusd", "awaiting_transfer_tusd", "unpaid_tusd", "reserve_tusd"];
    const rows = bill.map((l) => [l.berth, l.holder ?? "", l.status, (Number(l.days_x100) / 100).toFixed(2), tusd(l.daily_wage).replace(/,/g, ""), tusd(l.earned).replace(/,/g, ""), tusd(l.paid_to_berth).replace(/,/g, ""), tusd(l.paid_to_holder).replace(/,/g, ""), tusd(l.payable).replace(/,/g, ""), tusd(l.arrears).replace(/,/g, ""), tusd(l.reserve).replace(/,/g, "")]);
    const text = [`# Portage bill, ship #${id} ${ship?.name ?? ""}, read from NEAR testnet ${new Date().toISOString()}. Modelled on a master's wage account.`, head.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `portage-bill-ship-${id}.csv`;
    a.click();
  }

  const late = cov && BigInt(cov.arrears ?? "0") > 0n;
  const m = cov ? Number(cov.months_on_board_x100) / 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 print:max-w-none">
      <p className="eyebrow print:hidden">For shipowners and masters</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[56px]">{ship?.name ?? `Ship #${id}`}</h1>
      <p className="mono mt-2 text-[14px] text-[color:var(--slate)]">{ship ? `${ship.imo} · owner ${short(ship.owner, 26)} · one ship day = ${ship.secs_per_day}s${Number(ship.secs_per_day) < 86400 ? " (fast-clock demo)" : ""} · grace ${Number(ship.grace_secs) / Number(ship.secs_per_day)} ship days` : ""}</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[color:var(--mayday)] p-4 text-[color:var(--mayday)]">{error}</p>}
      {late && ship?.status === "Active" && <p role="alert" className="mt-6 rounded-2xl bg-[color:var(--mayday)] p-5 text-[17px] font-semibold text-white">Wages are late: {tusd(cov.arrears)} tUSD unpaid. Unless covered within {cov.grace_left_secs}s of ship time, anyone can declare this ship abandoned and release every crew member&apos;s guarantee.</p>}
      {ship?.status === "Abandoned" && <p role="alert" className="mt-6 rounded-2xl bg-[color:var(--ink)] p-5 text-[17px] font-semibold text-[color:var(--lemon)]">Abandoned at {nsToDate(ship.abandoned_at_ns)}. Each crew member&apos;s guarantee can be released by anyone.</p>}

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <p className="eyebrow">Coverage · months of wages on board</p>
          <p className="mono mt-2 text-[48px] leading-none">{months(cov?.months_on_board_x100)}</p>
          <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-[color:var(--paper)]" role="meter" aria-label="Months on board" aria-valuemin={0} aria-valuemax={6} aria-valuenow={m}>
            <div className={`h-full rounded-full ${m >= 4 ? "bg-[color:var(--lemon)]" : "bg-[color:var(--mayday)]"}`} style={{ width: `${Math.min(100, (m / 6) * 100)}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-[color:var(--ink)]" style={{ left: `${(4 / 6) * 100}%` }} aria-hidden />
          </div>
          <p className="mt-2 text-[13px] text-[color:var(--slate)]">The line marks the four-month floor. Reserved {tusd(cov?.reserved)} · free {tusd(cov?.unreserved)} · monthly bill {tusd(cov?.monthly_wage_bill)} tUSD</p>
        </div>
        <div className="card p-6 print:hidden">
          <p className="eyebrow">Top up the chest</p>
          <div className="mt-3 flex gap-2">
            <input aria-label="Amount in tUSD" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} className="mono min-h-12 w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper)] px-4" />
            <button type="button" className="btn btn-lemon" disabled={busy || !ship} onClick={() => go(`Fund ${amt} tUSD`, [tx.fund(id, toBase(amt))])}><PlusCircle size={16} aria-hidden /> Top up</button>
          </div>
          <button type="button" className="btn btn-outline mt-3" disabled={busy || !ship} onClick={() => go(`Withdraw ${amt} tUSD of surplus`, [tx.withdraw(id, toBase(amt))])}>Withdraw surplus</button>
          <p className="mt-2 text-[13px] text-[color:var(--slate)]">Withdrawals only ever reach true surplus. Try taking the reserve: the contract refuses.</p>
          <TxList items={log} />
        </div>
      </div>

      <section className="mt-10" aria-labelledby="bill">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="bill" className="display text-[32px] font-bold">Portage bill</h2>
            <p className="text-[14px] text-[color:var(--slate)]">One line per berth, read from chain. Modelled on a master&apos;s wage account; not any authority&apos;s template.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" className="btn btn-outline" onClick={csv} disabled={!bill.length}><Download size={16} aria-hidden /> CSV</button>
            <button type="button" className="btn btn-outline" onClick={() => window.print()} disabled={!bill.length}><Printer size={16} aria-hidden /> PDF</button>
          </div>
        </div>
        <div className="card mt-4 max-h-[70vh] overflow-auto" tabIndex={0} role="region" aria-label="Portage bill table">
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="sticky top-0 bg-[color:var(--paper-hi)]"><tr className="border-b border-[color:var(--hair)]">
              {["Berth", "Holder", "Status", "Days", "Daily wage", "Earned", "Paid to berth", "Paid to own account", "Awaiting", "Unpaid", "Reserve"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {bill.length === 0 && <tr><td className="p-3 text-[color:var(--slate)]" colSpan={11}>No berths yet.</td></tr>}
              {bill.map((l) => (
                <tr key={l.berth} className="ledger-row">
                  <td className="mono p-3"><a className="underline" href={`/berth/${l.berth}`}>{short(l.berth, 26)}</a></td>
                  <td className="mono p-3">{short(l.holder, 20)}</td>
                  <td className="p-3">{l.status}</td>
                  <td className="mono p-3">{(Number(l.days_x100) / 100).toFixed(1)}</td>
                  {[l.daily_wage, l.earned, l.paid_to_berth, l.paid_to_holder, l.payable, l.arrears, l.reserve].map((v, i) => <td key={i} className={`mono p-3 text-right ${i === 5 && BigInt(v) > 0n ? "text-[color:var(--mayday)]" : ""}`}>{tusd(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mono mt-2 text-[12px] text-[color:var(--slate)]">Funded {tusd(ship?.funded_total)} · paid {tusd(ship?.paid_total)} · withdrawn {tusd(ship?.withdrawn_total)} · reserved {tusd(ship?.reserved)} · free {tusd(ship?.unreserved)} · awaiting transfer {tusd(ship?.payable)} tUSD</p>
      </section>
    </div>
  );
}
