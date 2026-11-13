import type { Metadata } from "next";
import { JudgeRun } from "./JudgeRun";

export const metadata: Metadata = { title: "For judges: the 4-minute run · Berthright" };

export default function JudgePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">For judges · NEAR testnet · no wallet needed</p>
      <h1 className="display mt-3 text-[44px] font-extrabold leading-[1] sm:text-[64px]">The whole voyage in four minutes.</h1>
      <p className="mt-5 max-w-3xl text-[18px] leading-relaxed text-[color:var(--slate)]">
        Press start. Your browser creates three keys (shipowner, crew member, family); the server only creates the matching testnet accounts and has the crew welfare trust issue a real House of Stake berth to your crew account. Every step after that is signed in your browser and lands on testnet. The checklist ticks itself by reading the chain, not by trusting this page.
      </p>
      <p className="mt-3 max-w-3xl text-[15px] text-[color:var(--slate)]">The demo ship runs on a fast clock: one ship day is ten seconds, so a 6-day grace period is one minute. People and ships are fictional. Test dollars have no value.</p>
      <JudgeRun />
    </div>
  );
}
