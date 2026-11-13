import type { Metadata } from "next";
import { REPO, HOS_COMMIT } from "@/lib/config";

export const metadata: Metadata = { title: "Findings · Berthright" };

const H = (path: string, line: number) => `https://github.com/houseofstake/tla-contracts/blob/${HOS_COMMIT}/${path}#L${line}`;

export default function Page() {
  const rows = [
    { what: "Native NEAR above the storage reserve goes to the seller's payout account at transfer", where: ["contracts/hos-wallet/src/lib.rs", 791], test: "tla_transfer_sweeps_native_near_to_the_seller_but_leaves_tokens", out: 'swept_near {"payout_account":"arjun.test.near","amount":"5191552346517347000000000"}' },
    { what: "NEP-141 balances stay in the account and pass to the buyer", where: ["contracts/hos-wallet/src/lib.rs", 752], test: "tla_transfer_sweeps_native_near_to_the_seller_but_leaves_tokens", out: "100 tUSD in the berth before and after; the relief controls them" },
    { what: "Unless the registry allowlists the token: then the transfer is refused while the name holds it", where: ["contracts/tla-registry/src/nft.rs", 161], test: "an_allowlisted_token_blocks_the_transfer_until_the_berth_is_empty", out: "SubAccountHoldsTokens; transfer passes once emptied" },
    { what: "Every grant and extension except the authority is wiped", where: ["contracts/hos-wallet/src/lib.rs", 786], test: "tla_transfer_wipes_the_allotment_grant", out: "hos_spend_grant(allotment) = null; extensions = [authority, relief]" },
    { what: "A failed sweep leaves the NEAR for the new owner", where: ["contracts/hos-wallet/src/lib.rs", 917], test: "a_failed_sweep_leaves_the_near_for_the_new_owner", out: 'sweep_failed {"payout_account":"ghost.test.near","amount":"3191552346517347000000000"}' },
    { what: "rotation_seq goes up on every hand-over", where: ["contracts/hos-wallet/src/lib.rs", 794], test: "tla_transfer_sweeps_native_near_to_the_seller_but_leaves_tokens", out: "0 then 1" },
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">For House of Stake engineers</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[56px]">What moves when a berth changes hands.</h1>
      <p className="mt-5 max-w-3xl text-[18px] text-[color:var(--slate)]">Read in source at commit <span className="mono">{HOS_COMMIT.slice(0, 10)}</span>, then reproduced in a local sandbox against the real House of Stake wasm. This is a design detail, not a vulnerability: it is why Berthright pays wages in a token, signs off before the hand-over, and empties the berth in the same approval.</p>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead><tr className="border-b border-[color:var(--hair)]"><th className="p-3">What happens</th><th className="p-3">Source</th><th className="p-3">Sandbox test and output</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.what} className="ledger-row align-top">
                <td className="p-3 font-semibold">{r.what}</td>
                <td className="p-3"><a className="mono underline" href={H(r.where[0], r.where[1])}>{r.where[0].split("/").slice(-3).join("/")}:{r.where[1]}</a></td>
                <td className="p-3"><p className="mono text-[12px]">{r.test}</p><p className="mono mt-1 break-all text-[12px] text-[color:var(--slate)]">{r.out}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-[15px]">Full write-up: <a className="underline" href={`${REPO}/blob/main/docs/FINDINGS.md`}>docs/FINDINGS.md</a> and <a className="underline" href={`${REPO}/blob/main/docs/FRICTION.md`}>docs/FRICTION.md</a>. Reproduce: <span className="mono">fleet/build-hos.sh</span> then <span className="mono">cargo test -p portage --test tla_transfer</span>.</p>
    </div>
  );
}
