"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IDS } from "@/lib/config";
import { view } from "@/lib/near";
import { tusd, short } from "@/lib/format";

type Token = { token_id: string; owner_id: string; metadata?: { title?: string; extra?: string } };
type Row = Token & { berth?: any; leaseEnd?: number };

const STATE: Record<string, { label: string; tone: string }> = {
  Open: { label: "OPEN · AWAITING SIGN-ON", tone: "#c9a865" },
  Signed: { label: "SIGNED ON · RESERVE LOCKED", tone: "#3fbf9b" },
  Interrupted: { label: "SHIP ABANDONED", tone: "#ff6a3d" },
  SignedOff: { label: "SIGNED OFF · RECORD KEPT", tone: "#8fb3c7" },
  Released: { label: "GUARANTEE RELEASED", tone: "#ff9b7a" },
  none: { label: "NOT ON A SHIP YET", tone: "#8fb3c7" },
};

// One berth NFT, drawn from what the chain says about it right now.
export function BerthCard({ r }: { r: Row }) {
  const b = r.berth;
  const st = STATE[b?.status ?? "none"] ?? STATE.none;
  const need = b ? Number(b.reserve_needed) : 0;
  const have = b ? Number(b.reserve) : 0;
  const pct = need > 0 ? Math.min(1, have / need) : b?.status === "Released" ? 1 : 0;
  const name = r.token_id.split(".")[0];
  const id = name.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox="0 0 300 190" className="block h-auto w-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10293a" /><stop offset="1" stopColor="#06121a" /></linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7c46a" /><stop offset=".45" stopColor="#ec7f4f" /><stop offset=".46" stopColor="#1f4e63" /><stop offset="1" stopColor="#0b2533" /></linearGradient>
        <clipPath id={`${id}-p`}><circle cx="62" cy="82" r="34" /></clipPath>
      </defs>
      <rect width="300" height="190" rx="14" fill={`url(#${id}-g)`} />
      <path d="M0 47H300M0 95H300M0 142H300M75 0V190M150 0V190M225 0V190" stroke="#fff" strokeOpacity=".04" />
      <circle cx="62" cy="82" r="44" fill="#c9a865" />
      <circle cx="62" cy="82" r="39" fill="#8d6c34" />
      <g clipPath={`url(#${id}-p)`}>
        <rect x="20" y="40" width="90" height="90" fill={b?.status === "Interrupted" ? "#3a1416" : `url(#${id}-s)`} />
        <circle cx="62" cy="74" r="8" fill={b?.status === "Interrupted" ? "#ff6a3d" : "#fff2c8"} />
      </g>
      <text x="122" y="40" fill="#c9a865" fontFamily="var(--font-plex), monospace" fontSize="9" letterSpacing="1.3">BERTH · NEP-171</text>
      <text x="122" y="66" fill="#f4f7f8" fontFamily="var(--font-fraunces), serif" fontSize="21" letterSpacing="-.5">{name.length > 15 ? `${name.slice(0, 14)}…` : name}</text>
      <text x="122" y="83" fill="#9fb2bc" fontFamily="var(--font-plex), monospace" fontSize="9">holder {short(r.owner_id, 20)}</text>
      <text x="122" y="108" fill="#9fb2bc" fontFamily="var(--font-plex), monospace" fontSize="8.5" letterSpacing="1.2">RESERVE</text>
      <rect x="122" y="114" width="160" height="6" rx="3" fill="#fff" fillOpacity=".1" />
      <rect x="122" y="114" width={160 * pct} height="6" rx="3" fill={st.tone} />
      <text x="122" y="136" fill="#dbe6eb" fontFamily="var(--font-plex), monospace" fontSize="9">{b ? `${tusd(b.reserve, 0)} of ${tusd(b.reserve_needed, 0)} tUSD` : "no wage chest entry"}</text>
      <rect x="0" y="152" width="300" height="38" fill="#000" fillOpacity=".25" />
      <circle cx="18" cy="171" r="4" fill={st.tone} />
      <text x="30" y="174" fill={st.tone} fontFamily="var(--font-plex), monospace" fontSize="9" letterSpacing="1.3">{st.label}</text>
      <rect x=".75" y=".75" width="298.5" height="188.5" rx="13.5" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1.5" />
    </svg>
  );
}

export function Register() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [supply, tokens] = await Promise.all([
          view<string>(IDS.registry, "nft_total_supply"),
          view<Token[]>(IDS.registry, "nft_tokens", { from_index: "0", limit: 60 }),
        ]);
        setTotal(supply);
        const crew = tokens.filter((t) => t.token_id.endsWith(`.${IDS.registrar}`) || t.token_id.includes(".crew."));
        setRows(crew);
        const filled = await Promise.all(crew.map(async (t) => {
          let berth: any;
          try { berth = await view<any>(IDS.portage, "get_berth", { berth: t.token_id }); } catch { berth = undefined; }
          let leaseEnd: number | undefined;
          try { leaseEnd = Number(JSON.parse(t.metadata?.extra ?? "{}").expires_at) / 1e6; } catch { leaseEnd = undefined; }
          return { ...t, berth, leaseEnd };
        }));
        setRows(filled);
      } catch (e) { setErr(String((e as Error).message).slice(0, 160)); }
    })();
  }, []);
  if (err) return <p className="mono mt-10 text-[14px] text-[color:var(--mayday)]">Testnet did not answer: {err}</p>;
  return (
    <section className="mt-12" aria-label="Berth tokens">
      <p className="mono text-[14px] text-[color:var(--slate)]" aria-live="polite">
        {rows ? `${rows.length} crew berths read from ${IDS.registry} (registry supply ${total ?? "-"})` : "Reading the registry..."}
      </p>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(rows ?? Array.from({ length: 6 }, (_, i) => ({ token_id: `loading-${i}`, owner_id: "" }) as Row)).map((r) => (
          <li key={r.token_id} className="card glow-card p-3">
            {r.owner_id ? (
              <Link href={`/berth/${r.token_id}`} className="block rounded-[12px]">
                <span className="sr-only">Berth {r.token_id}, held by {r.owner_id}, {r.berth?.status ?? "not on a ship"}</span>
                <BerthCard r={r} />
              </Link>
            ) : (
              <div className="aspect-[300/190] animate-pulse rounded-[12px] bg-[color:var(--ink)]/10 motion-reduce:animate-none" />
            )}
            {r.owner_id && (
              <dl className="mono mt-3 grid grid-cols-2 gap-2 px-2 pb-1 text-[12px] text-[color:var(--slate)]">
                <div><dt className="uppercase tracking-[0.12em]">Earned</dt><dd className="text-[14px] text-[color:var(--ink)]">{r.berth ? `${tusd(r.berth.earned, 2)} tUSD` : "-"}</dd></div>
                <div><dt className="uppercase tracking-[0.12em]">Lease ends</dt><dd className="text-[14px] text-[color:var(--ink)]">{r.leaseEnd ? new Date(r.leaseEnd).toISOString().slice(0, 10) : "-"}</dd></div>
              </dl>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
