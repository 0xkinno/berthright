import Link from "next/link";
import { Mark } from "./Logo";
import { ShipClock } from "./ShipClock";
import { REPO } from "@/lib/config";

export function Footer() {
  return (
    <footer className="night mt-28">
      <div className="mx-auto grid max-w-[1344px] gap-10 px-4 pb-10 pt-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3"><Mark size={34} title="" /><span className="display text-[26px] !tracking-[-0.03em]">Berthright</span></div>
          <p className="mt-4 max-w-sm text-[15px] text-[color:var(--mist)]">Four months of crew wages on board, without an insurance claim. Built at NEAR HACKATHON, November 2026.</p>
          <p className="mt-3 max-w-sm text-[13px] text-[color:var(--mist)]">Arjun, the MV Kestrel and Kestrel Bulk Carriers are fictional. Demo ships run on a fast clock on NEAR testnet. Test dollars have no value.</p>
        </div>
        <nav aria-label="Product">
          <p className="eyebrow">Product</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            {[["/crew", "Crew berth"], ["/judge", "For judges"], ["/proof", "Proof from chain"], ["/break", "Break it"], ["/findings", "Findings"]].map(([h, l]) => (
              <li key={h}><Link className="stitch-link inline-flex min-h-11 items-center" href={h}>{l}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Project">
          <p className="eyebrow">Project</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            <li><a className="stitch-link inline-flex min-h-11 items-center" href={REPO}>Source code (MIT)</a></li>
            <li><a className="stitch-link inline-flex min-h-11 items-center" href={`${REPO}/blob/main/docs/THREAT_MODEL.md`}>Threat model</a></li>
            <li><Link className="stitch-link inline-flex min-h-11 items-center" href="/api/status">Service status</Link></li>
            <li><a className="stitch-link inline-flex min-h-11 items-center" href="https://github.com/houseofstake/tla-contracts">House of Stake TLA contracts</a></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1344px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-5 sm:px-8">
        <span className="corner-label">25°20′N 56°22′E · Khor Fakkan anchorage</span>
        <ShipClock className="corner-label" />
      </div>
    </footer>
  );
}
