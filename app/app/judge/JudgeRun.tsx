"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Circle, Loader2, Play, RotateCcw } from "lucide-react";
import { DEPLOYED, IDS, explorerAccount } from "@/lib/config";
import { browserSigner, delKey, newBrowserKey, pinnedBerth, putKey, view, getKey, type Signer, type Outcome, type TxSpec } from "@/lib/near";
import { tx, SAMPLE_SEA_TEXT, sha256hex } from "@/lib/actions";
import { tusd, short } from "@/lib/format";
import { TxList, type TxRecord } from "@/components/TxList";
import { useSession } from "@/components/Session";

const WAGE = "10000000"; // 10 tUSD per ship day
const ALLOWANCE = "200000000"; // 200 tUSD fare home
const RESERVE = 10_000_000n * 120n + 200_000_000n; // 1,400 tUSD
const SURPLUS = 30_000_000n; // three ship days of wages, then the owner stops
const SPD = 10;
const GRACE_DAYS = 6;

type Judge = { owner: { accountId: string; secretKey: string }; crew: { accountId: string; secretKey: string }; family: { accountId: string; secretKey: string }; berth: string; shipId?: string; seaHash?: string; step?: number };

const STEPS = [
  { t: "Set up", d: "Three browser keys; the trust issues a berth (a House of Stake leased name) to your crew account." },
  { t: "Open the ship", d: "The shipowner opens MV Kestrel (fictional) on a fast clock and opens the berth at 10 tUSD a day." },
  { t: "Sign-on refused", d: "The owner funds 1,000 tUSD; the berth needs 1,400 (four months plus the fare home). The contract refuses the sign-on." },
  { t: "Signed on", d: "The owner adds the rest. The crew member signs on with the wage from their own contract. 1,400 tUSD are locked." },
  { t: "Wages land in the berth", d: "Wages accrue by the second; settle pays them into the berth account." },
  { t: "The allotment goes home", d: "The crew member grants the allotment contract a fence on the berth (one receiver, 50 tUSD budget) and it pays the family." },
  { t: "The owner stops paying", d: "The surplus runs out after three ship days. An early declaration is refused with the seconds left." },
  { t: "Release to the crew member", d: "After the grace, anyone declares abandonment and releases the guarantee to the crew member's own account." },
];

function rec(label: string, o: Outcome): TxRecord {
  return { label, hash: o.hash, ok: o.ok, failure: o.failure, at: new Date().toISOString() };
}

export function JudgeRun() {
  const { refreshJudge } = useSession();
  const [judge, setJudge] = useState<Judge | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<boolean[]>(Array(STEPS.length).fill(false));
  const [txs, setTxs] = useState<TxRecord[][]>(STEPS.map(() => []));
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { getKey<Judge>("judge").then((j) => j && setJudge(j)); }, []);
  useEffect(() => { tick.current = setInterval(() => setNow(Date.now()), 1000); return () => { if (tick.current) clearInterval(tick.current); }; }, []);

  const save = async (j: Judge) => { setJudge(j); await putKey("judge", j); await refreshJudge(); };
  const add = (i: number, r: TxRecord) => setTxs((s) => s.map((l, k) => (k === i ? [...l, r] : l)));
  const signer = useCallback(async (role: "owner" | "crew" | "family", j = judge): Promise<Signer> => {
    if (!j) throw new Error("no run");
    return browserSigner(j[role].accountId, j[role].secretKey);
  }, [judge]);
  async function send(i: number, label: string, s: Signer, specs: TxSpec[]) {
    const out = await s.send(specs);
    out.forEach((o, k) => add(i, rec(specs.length > 1 ? `${label} (${k + 1}/${specs.length})` : label, o)));
    return out;
  }

  // The checklist reads the chain on every refresh; nothing is ticked from the page's own state.
  const verify = useCallback(async (j: Judge | null = judge) => {
    if (!j || !DEPLOYED) return;
    const d = Array(STEPS.length).fill(false);
    const f: Record<string, string> = {};
    try {
      const p = await pinnedBerth(j.berth);
      d[0] = p.agree && p.item.owner_id === j.crew.accountId;
      f.rotation = p.item.rotation_seq; f.block = String(p.block.height); f.berthStatus = p.item.status;
      if (j.shipId !== undefined) {
        const ship = await view<any>(IDS.portage, "get_ship", { ship_id: j.shipId }, { ttlMs: 0 });
        const b = await view<any>(IDS.portage, "get_berth", { berth: j.berth }, { ttlMs: 0 });
        const cov = await view<any>(IDS.portage, "coverage", { ship_id: j.shipId }, { ttlMs: 0 });
        d[1] = !!ship && !!b;
        f.status = b?.status; f.reserved = ship?.reserved; f.arrears = cov?.arrears; f.graceLeft = cov?.grace_left_secs ?? ""; f.shipStatus = ship?.status;
        d[3] = !!b && ["Signed", "Released"].includes(b.status) && BigInt(b.reserve) + BigInt(b.paid_to_holder) >= 0n && (b.status === "Released" || BigInt(ship.reserved) >= RESERVE);
        d[2] = d[3] || txs[2].some((t) => !t.ok && (t.failure ?? "").includes("E_RESERVE_NOT_ON_BOARD"));
        const inBerth = await view<string>(IDS.tusd, "ft_balance_of", { account_id: j.berth }, { ttlMs: 0 });
        f.inBerth = inBerth;
        d[4] = BigInt(b?.paid_to_berth ?? "0") > 0n;
        const fam = await view<string>(IDS.tusd, "ft_balance_of", { account_id: j.family.accountId }, { ttlMs: 0 });
        f.family = fam;
        d[5] = BigInt(fam) > 0n;
        d[6] = ship?.status === "Abandoned" || txs[6].some((t) => !t.ok && (t.failure ?? "").includes("E_NOT_YET_ABANDONED"));
        d[7] = b?.status === "Released";
        f.paidToCrew = b?.paid_to_holder;
      }
    } catch (e) {
      setError(`Could not read testnet: ${(e as Error).message.slice(0, 160)}`);
    }
    setDone(d);
    setFacts(f);
  }, [judge, txs]);

  useEffect(() => { verify(); const t = setInterval(() => verify(), 6000); return () => clearInterval(t); }, [verify]);

  async function run(i: number, fn: () => Promise<void>) {
    setBusy(STEPS[i].t); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); verify(); }
  }

  const start = () => run(0, async () => {
    const [o, c, f] = await Promise.all([newBrowserKey(), newBrowserKey(), newBrowserKey()]);
    const res = await fetch("/api/judge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ownerPk: o.publicKey, crewPk: c.publicKey, familyPk: f.publicKey }) });
    const j = await res.json();
    Object.entries(j.txs ?? {}).forEach(([k, h]) => add(0, { label: k.replace(/_/g, " "), hash: String(h), ok: true, at: new Date().toISOString() }));
    if (!j.ok) throw new Error(j.reason);
    const next: Judge = { owner: { accountId: j.accounts.owner, secretKey: o.secretKey }, crew: { accountId: j.accounts.crew, secretKey: c.secretKey }, family: { accountId: j.accounts.family, secretKey: f.secretKey }, berth: j.berth, step: 1, seaHash: await sha256hex(SAMPLE_SEA_TEXT) };
    await save(next);
  });

  const openShip = () => run(1, async () => {
    const j = judge!; const owner = await signer("owner");
    await send(1, "Owner draws test dollars", owner, [tx.faucet()]);
    const [created] = await send(1, "Create ship", owner, [tx.createShip({ name: "MV Kestrel (fictional)", imo: "IMO 0000000 (fictional)", spd: SPD, graceDays: GRACE_DAYS, allowance: ALLOWANCE })]);
    if (!created.ok) throw new Error("The ship was not created.");
    const shipId = String(created.value);
    await send(1, "Open the berth", owner, [tx.openBerth(shipId, j.berth, WAGE, 270, j.seaHash!)]);
    await send(1, "Register the crew, family and berth for test dollars", owner, [tx.register(j.crew.accountId), tx.register(j.family.accountId), tx.register(j.berth)]);
    await save({ ...j, shipId, step: 2 });
  });

  const refused = () => run(2, async () => {
    const j = judge!;
    await send(2, "Owner funds 1,000 tUSD", await signer("owner"), [tx.fund(j.shipId!, "1000000000")]);
    await send(2, "Crew member tries to sign on", await signer("crew"), [tx.signOn(j.berth, WAGE, j.seaHash!)]);
    await save({ ...j, step: 3 });
  });

  const signOn = () => run(3, async () => {
    const j = judge!;
    const top = (RESERVE + SURPLUS - 1_000_000_000n).toString();
    await send(3, `Owner adds ${tusd(top)} tUSD`, await signer("owner"), [tx.fund(j.shipId!, top)]);
    const [o] = await send(3, "Crew member signs on with their own wage", await signer("crew"), [tx.signOn(j.berth, WAGE, j.seaHash!)]);
    if (!o.ok) throw new Error("Sign-on was refused; see the transaction.");
    await save({ ...j, step: 4 });
  });

  const wages = () => run(4, async () => {
    const j = judge!;
    await send(4, "Settle (anyone may call it)", await signer("family"), [tx.settle(j.berth)]);
    await save({ ...j, step: 5 });
  });

  const allot = () => run(5, async () => {
    const j = judge!; const crew = await signer("crew");
    const expires = (BigInt(Date.now()) * 1_000_000n + 30n * 86_400n * 1_000_000_000n).toString();
    await send(5, "Add the allotment as an extension, grant the fence, set the allotment", crew, [tx.addExtension(j.berth), tx.grantSpend(j.berth, j.family.accountId, "50000000", expires), tx.setAllotment(j.berth, j.family.accountId, "5000000", 60)]);
    await send(5, "Run the allotment (anyone may call it)", await signer("owner"), [tx.runAllotment(j.berth)]);
    await save({ ...j, step: 6 });
  });

  const early = () => run(6, async () => {
    const j = judge!;
    await send(6, "Settle: the chest runs dry, wages become arrears", await signer("family"), [tx.settle(j.berth)]);
    await send(6, "Try to declare abandonment now", await signer("family"), [tx.declare(j.shipId!)]);
    await save({ ...j, step: 7 });
  });

  const release = () => run(7, async () => {
    const j = judge!; const anyone = await signer("family");
    const [d] = await send(7, "Declare abandonment", anyone, [tx.declare(j.shipId!)]);
    if (!d.ok) throw new Error("Not yet: the grace period is still running. Wait for the countdown and press again.");
    await send(7, "Release the guarantee to the crew member's own account", anyone, [tx.release(j.berth)]);
  });

  const breakIt = async (kind: "stranger" | "withdraw" | "ungranted") => {
    if (!judge?.shipId) return;
    setBusy("Break it"); setError(null);
    try {
      if (kind === "stranger") await send(7, "Break it: the family account tries to sign on", await signer("family"), [tx.signOn(judge.berth, WAGE, judge.seaHash!)]);
      if (kind === "withdraw") await send(7, "Break it: owner tries to withdraw the reserve", await signer("owner"), [tx.withdraw(judge.shipId, RESERVE.toString())]);
      if (kind === "ungranted") {
        const crew = await signer("crew");
        await send(7, "Break it: point the allotment at an ungranted receiver", crew, [tx.setAllotment(judge.berth, judge.owner.accountId, "5000000", 60)]);
        await send(7, "Break it: run it", crew, [tx.runAllotment(judge.berth)]);
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const reset = async () => { await delKey("judge"); setJudge(null); setTxs(STEPS.map(() => [])); setDone(Array(STEPS.length).fill(false)); await refreshJudge(); };

  const actions = [start, openShip, refused, signOn, wages, allot, early, release];
  const step = judge?.step ?? 0;
  const count = done.filter(Boolean).length;

  if (!DEPLOYED) {
    return <p role="alert" className="mt-10 rounded-2xl border border-[color:var(--mayday)] p-5 text-[17px] text-[color:var(--mayday)]">The contracts are not deployed to testnet yet, so the run cannot start. This page says so instead of pretending.</p>;
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ol className="space-y-4">
        {STEPS.map((s, i) => {
          const active = i === step && !busy;
          return (
            <li key={s.t} className={`card p-5 sm:p-6 ${i === step ? "ring-2 ring-[color:var(--ink)]" : ""}`}>
              <div className="flex items-start gap-4">
                <span aria-hidden className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${done[i] ? "border-[color:var(--signal)] bg-[color:var(--signal)] text-white" : "border-[color:var(--hair)]"}`}>
                  {done[i] ? <Check size={16} /> : <span className="mono text-[13px]">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="display text-[24px] font-bold">{s.t}</h2>
                  <p className="mt-1 text-[16px] text-[color:var(--slate)]">{s.d}</p>
                  {i === 6 && judge?.shipId && facts.graceLeft !== undefined && facts.graceLeft !== "" && <p className="mono mt-2 text-[14px]">Grace left: {facts.graceLeft}s</p>}
                  {i <= step && (
                    <button type="button" onClick={actions[i]} disabled={!!busy || (i > 0 && !judge) || (i !== step && i !== 7 && i !== 4)} className={`btn mt-4 ${active ? "btn-lemon" : "btn-outline"}`}>
                      {busy === s.t ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Play size={16} aria-hidden />}
                      {i === 0 ? "Start the 4-minute run" : done[i] ? "Run again" : "Do it"}
                    </button>
                  )}
                  <TxList items={txs[i]} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="card p-5">
          <p className="eyebrow">Checklist · read from chain</p>
          <p className="mono mt-2 text-[40px] leading-none">{count}/{STEPS.length}</p>
          <ul className="mt-4 space-y-2 text-[14px]">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex items-center gap-2">{done[i] ? <Check size={16} className="text-[color:var(--signal)]" aria-label="done" /> : <Circle size={16} className="text-[color:var(--hair)]" aria-label="not yet" />}{s.t}</li>
            ))}
          </ul>
          <p className="mono mt-3 text-[12px] text-[color:var(--slate)]">Rechecked every 6 s · {new Date(now).toISOString().slice(11, 19)} UTC</p>
        </div>
        {judge && (
          <div className="card space-y-2 p-5 text-[14px]">
            <p className="eyebrow">Your run</p>
            <p>Berth: <a className="mono underline" href={`/berth/${judge.berth}`}>{short(judge.berth, 30)}</a></p>
            <p>Crew: <a className="mono underline" href={explorerAccount(judge.crew.accountId)}>{short(judge.crew.accountId, 26)}</a></p>
            {judge.shipId && <p>Ship: <a className="mono underline" href={`/ship/${judge.shipId}`}>#{judge.shipId}</a> · {facts.shipStatus}</p>}
            {facts.inBerth && <p>In the berth: <span className="mono">{tusd(facts.inBerth)} tUSD</span></p>}
            {facts.family && <p>Family received: <span className="mono">{tusd(facts.family)} tUSD</span></p>}
            {facts.paidToCrew && <p>Paid to crew&apos;s own account: <span className="mono">{tusd(facts.paidToCrew)} tUSD</span></p>}
            {facts.block && <p className="mono text-[12px] text-[color:var(--slate)]">Berth read at block {facts.block}, rotation {facts.rotation}</p>}
            <button type="button" onClick={reset} className="btn btn-outline mt-2 w-full"><RotateCcw size={16} aria-hidden /> Start over</button>
          </div>
        )}
        {judge?.shipId && (
          <div className="card p-5">
            <p className="eyebrow">Failure buttons</p>
            <div className="mt-3 grid gap-2">
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => breakIt("stranger")}>A stranger signs on</button>
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => breakIt("withdraw")}>Owner takes the reserve</button>
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => breakIt("ungranted")}>Allotment to a stranger</button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl border border-[color:var(--mayday)] bg-[#f8ebe4] p-4 text-[15px] text-[color:var(--mayday)]">{error}</p>}
      </aside>
    </div>
  );
}
