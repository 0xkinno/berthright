import { ExternalLink } from "lucide-react";
import { MAINNET } from "@/lib/proof";

const LABELS: [string, string][] = [
  ["create_root", "berthright.near created"],
  ["deploy_chest", "Wage chest deployed (same build as testnet)"],
  ["chest_new", "Chest wired to House of Stake registry.hos, namespace seafarer"],
  ["seal_chest_delete_key", "Chest sealed: its only key deleted"],
  ["rent_berth", "Berth rented: berthright.seafarer, a House of Stake leased name"],
  ["intents_deposit_wnear", "Shipowner buys USDC with NEAR through NEAR Intents (1Click)"],
  ["create_ship", "Ship created: real USDC, demo clock"],
  ["open_berth", "Berth opened on the ship"],
  ["sign_on_refused", "Sign-on refused: four months not on board"],
  ["fund_reserve_usdc", "Four months plus the fare home locked, in USDC"],
  ["sign_on", "Crew member signs on"],
  ["settle_arrears", "Settle: unpaid wages recorded"],
  ["declare_refused_early", "Early abandonment refused"],
  ["declare_abandonment", "Abandonment declared"],
  ["release_guarantee_usdc", "Guarantee released in USDC to the crew member"],
];

export function MainnetVoyage() {
  const run = MAINNET.run ?? {};
  const tx = run.tx ?? {};
  const funding = run.notes?.funding ?? [];
  const rel = run.notes?.release;
  return (
    <section className="mt-16" aria-labelledby="mainnet-title">
      <p className="eyebrow">NEAR mainnet · real money</p>
      <h2 id="mainnet-title" className="display mt-3 scroll-mt-32 text-[34px] leading-[1.05] sm:text-[44px]">The same chest, on mainnet, in USDC.</h2>
      <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-[color:var(--slate)]">
        Funded from Base through NEAR Intents. A keyless wage chest on mainnet locked four months plus the fare home for a real House of Stake berth, <span className="mono text-[15px]">{MAINNET.berth}</span>, refused an early sign-on and an early declaration, and released {rel ? (Number(rel.amount) / 1e6).toFixed(2) : "the"} USDC to <span className="mono text-[15px]">{MAINNET.crew}</span>. Demo scale: 0.01 USDC a ship day on a ten-second ship day.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {funding.map((f: any, i: number) => (
          <a key={i} href={`https://nearblocks.io/txns/${f.near_tx}`} className="card flex items-center justify-between gap-4 p-4">
            <span className="text-[15px]"><b>{f.amount_in} USDC on Base</b> to {Number(f.near_out).toFixed(2)} NEAR, via NEAR Intents</span>
            <ExternalLink size={15} aria-hidden />
          </a>
        ))}
      </div>
      <ol className="mt-4 space-y-2">
        {LABELS.filter(([k]) => tx[k]).map(([k, label]) => (
          <li key={k}>
            <a href={`https://nearblocks.io/txns/${tx[k]}`} className="card flex min-h-12 items-center justify-between gap-4 px-4 py-3">
              <span className="text-[15px]">{label}</span>
              <span className="mono inline-flex items-center gap-1 text-[13px] text-[color:var(--slate)]">{String(tx[k]).slice(0, 8)}… <ExternalLink size={13} aria-hidden /></span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
