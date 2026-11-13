import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import runs from "@/lib/generated/runs.json";
import { explorerTx } from "@/lib/config";
import { CODES } from "@/lib/codes";

export const metadata: Metadata = { title: "Break it · Berthright" };

const CAMPAIGN = [
  { id: "withdraw_reserve", h: "The owner withdraws the reserve", code: "E_RESERVE_LOCKED", test: "the_owner_cannot_withdraw_the_reserve" },
  { id: "lower_wage", h: "Sign-on at a lower wage than the contract", code: "E_WAGE_DIFFERS_FROM_YOUR_CONTRACT", test: "sign_on_is_refused_when_the_wage_differs_from_the_crew_members_contract" },
  { id: "early_abandonment", h: "Abandonment declared early", code: "E_NOT_YET_ABANDONED", test: "abandonment_cannot_be_declared_before_the_grace_ends" },
  { id: "non_holder", h: "A stranger signs on", code: "E_NOT_BERTH_HOLDER", test: "a_non_holder_cannot_sign_on" },
  { id: "old_holder_allotment", h: "The old holder's allotment after hand-over", code: "E_BERTH_CHANGED_HANDS", test: "allotment_stops_after_hand_over" },
  { id: "ungranted_receiver", h: "Allotment to a receiver nobody granted", code: "RECEIVER_NOT_GRANTED", test: "allotment_pays_only_the_granted_receiver_up_to_the_budget" },
  { id: "over_budget", h: "Allotment over the budget", code: "TOKEN_CAP_EXCEEDED", test: "allotment_pays_only_the_granted_receiver_up_to_the_budget" },
  { id: "add_key", h: "AddKey on a berth", code: "no key path exists", test: "add_key_on_a_berth_is_impossible_and_house_of_stake_cannot_move_it_alone" },
  { id: "hos_transfer_alone", h: "House of Stake moves a live berth without the holder", code: "TRANSFER_NOT_REQUESTED", test: "add_key_on_a_berth_is_impossible_and_house_of_stake_cannot_move_it_alone" },
  { id: "reserve_missing", h: "Sign-on before four months are on board", code: "E_RESERVE_NOT_ON_BOARD", test: "sign_on_is_refused_until_four_months_are_on_board" },
];

export default function Page() {
  const recorded: Record<string, { hash: string; decoded?: string }> = ((runs as any)?.break ?? {}) as never;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">For judges</p>
      <h1 className="display mt-3 text-[40px] font-extrabold leading-[1] sm:text-[56px]">Every refusal, on chain.</h1>
      <p className="mt-5 max-w-3xl text-[18px] text-[color:var(--slate)]">Each row is a real testnet transaction that tried to break a rule and was refused, with the decoded error and the test that pins the rule. To try them yourself, start the <Link className="underline" href="/judge">judge run</Link> and use its failure buttons.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {CAMPAIGN.map((c) => {
          const r = recorded[c.id];
          return (
            <li key={c.id} className="card p-6">
              <p className="text-[18px] font-semibold">{c.h}</p>
              <p className="mono mt-2 text-[14px] text-[color:var(--mayday)]">{c.code}</p>
              <p className="mt-2 text-[14px] text-[color:var(--slate)]">{CODES[c.code] ?? "The berth wallet has no method that adds a key; a request shaped like one is refused."}</p>
              <p className="mono mt-3 break-all text-[12px]">test: {c.test}</p>
              {r ? <a className="mt-3 inline-flex min-h-11 items-center gap-1 font-semibold underline" href={explorerTx(r.hash)}>Refused transaction <ExternalLink size={14} aria-hidden /></a> : <p className="mt-3 text-[13px] text-[color:var(--slate)]">Testnet transaction not recorded yet (the campaign runs after deployment).</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
