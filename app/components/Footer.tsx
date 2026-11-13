import Link from "next/link";
import { Mark } from "./Logo";
import { REPO } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-dashed border-[color:var(--stitch)] bg-[color:var(--paper-hi)]/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5"><Mark size={30} title="" /><span className="text-xl font-bold tracking-[-0.01em]">Berthright</span></div>
          <p className="mt-3 max-w-sm text-[15px] text-[color:var(--slate)]">Four months of crew wages on board, without an insurance claim. Built at NEAR HACKATHON, November 2026.</p>
          <p className="mt-3 text-[13px] text-[color:var(--slate)]">Arjun, the MV Kestrel and Kestrel Bulk Carriers are fictional. Demo ships run on a fast clock on NEAR testnet. Test dollars have no value.</p>
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
    </footer>
  );
}
