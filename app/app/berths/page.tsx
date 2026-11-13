import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Register } from "./Register";

export const metadata: Metadata = { title: "The berth register · Berthright" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1344px] px-4 sm:px-8">
      <p className="eyebrow">NFTs that do something</p>
      <h1 className="display mt-3 max-w-4xl text-[40px] leading-[1] sm:text-[60px]">The berth register.</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <p className="text-[18px] leading-relaxed text-[color:var(--slate)]">
          Every berth below is an NEP-171 token minted by House of Stake&apos;s registry, and every token is also a NEAR account with its own wallet and no keys. The card is drawn from the chain: the holder from <span className="mono text-[15px]">nft_token</span>, the lease from the token&apos;s metadata, and the money from the wage chest. Transfer the token and the account, its wages and its sea-service record go with it; the old holder&apos;s allotment does not.
        </p>
        <div className="card p-6">
          <p className="eyebrow">How a berth is minted</p>
          <ol className="mt-3 space-y-2 text-[15px] leading-relaxed">
            <li><span className="mono text-[color:var(--flare)]">1</span> The crew welfare trust, a payment authority on the crew namespace, calls <span className="mono text-[13px]">rent_sub_account_paid</span>.</li>
            <li><span className="mono text-[color:var(--flare)]">2</span> The registry mints the token to the seafarer and deploys the House of Stake wallet at that name.</li>
            <li><span className="mono text-[color:var(--flare)]">3</span> The shipowner opens it on a ship; sign-on waits until four months are locked.</li>
          </ol>
          <Link href="/judge" className="btn btn-lemon mt-5">Get a berth minted to you <ArrowRight size={17} aria-hidden /></Link>
        </div>
      </div>
      <Register />
    </div>
  );
}
