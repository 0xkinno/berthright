import Link from "next/link";
import facts from "@/lib/generated/facts.json";
import runs from "@/lib/generated/runs.json";
import { HarborArt } from "@/components/HarborArt";
import { RopeUnderline } from "@/components/Rope";
import { HeroLive } from "@/components/HeroLive";
import { Reveal, RevealItem, HeroPatch } from "@/components/Reveal";
import { Anatomy } from "@/components/Anatomy";
import { LiveStats } from "@/components/LiveStats";
import { ReserveScene, WagesScene, AllotmentScene, ReleaseScene } from "@/components/Scenes";
import { PortageArt } from "@/components/Art";
import { explorerTx } from "@/lib/config";
import { ArrowRight, ExternalLink } from "lucide-react";

const F = facts as any;
const R = (runs as any) ?? {};
const fmt = (n: number) => n.toLocaleString("en-US");
const ITF = "https://www.itfseafarers.org/en/news/seafarer-abandonment-crisis-thousands-left-behind-shippings-worst-year-record";
const LEG = "https://www.itfglobal.org/sites/default/files/node/resources/files/2018%20LEG%20105-4-3%20-%20Implementation%20of%20the%20financial%20security%20requirement%20under%20MLC%2C%202006%2C%20as%20amended%2C%20for%20the...%20%28ITF%29.pdf";

function Heading({ n, kicker, title }: { n: string; kicker: string; title: React.ReactNode }) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-center gap-3"><span className="tag">Nº {n}</span><span className="eyebrow">{kicker}</span></div>
      <h2 className="display mt-4 max-w-4xl text-[38px] leading-[1.02] sm:text-[58px]">{title}</h2>
    </Reveal>
  );
}

const STEPS = [
  { n: "01", k: "Reserve", tint: "tint-sand", h: "No reserve, no sign-on.", p: "Before anyone steps aboard, the shipowner locks four months of that berth's wages and the fare home in the wage chest. If it is not on board, the contract refuses the crew member. Nobody can skip this step.", art: <ReserveScene /> },
  { n: "02", k: "Wages", tint: "tint-sea", h: "Wages arrive every day, by themselves.", p: "Pay accrues by the second, down to the last base unit, and anyone may settle it into the berth account. A scheduled job does it on its own. The crew member never chases a payslip.", art: <WagesScene /> },
  { n: "03", k: "Allotment", tint: "tint-coral", h: "The money home goes inside a fence.", p: "Arjun grants the allotment one receiver, one token, a budget and an expiry, written into his berth's own wallet. House of Stake's audited code enforces the fence. Hand the berth over and the fence is gone.", art: <AllotmentScene /> },
  { n: "04", k: "Release", tint: "tint-sky", h: "If the owner stops paying, the flare goes up.", p: "After 14 ship days of unpaid wages (the law allows two months), anyone can declare the ship abandoned and release each crew member's four months and fare home, straight to their own account. No claim. No insurer.", art: <ReleaseScene /> },
];

export default function Home() {
  const w = F.world, r = F.replay;
  const breaks: [string, string][] = [
    ["withdraw_reserve", "The owner takes the reserve back"],
    ["lower_wage", "Sign-on at a lower wage than the contract"],
    ["early_abandonment", "Abandonment declared early"],
    ["non_holder", "A stranger signs on to Arjun's berth"],
    ["old_holder_allotment", "The old holder's allotment after hand-over"],
    ["over_budget", "An allotment past its budget"],
  ];
  return (
    <div className="-mt-24 sm:-mt-28">
      <section aria-labelledby="hero-title" className="relative">
        <div className="relative h-[min(56vw,660px)] min-h-[380px] overflow-hidden">
          <HarborArt className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-[60%] sm:-translate-x-[52%] lg:left-0 lg:w-full lg:translate-x-0" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[color:var(--paper)]/40" />
        </div>
        <HeroPatch className="patch relative z-10 mx-auto -mt-[clamp(56px,8vw,128px)] w-[calc(100%-24px)] max-w-[1344px] px-6 py-9 sm:w-[calc(100%-64px)] sm:px-12 sm:py-12 lg:px-16">
          <div className="grid items-end gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
            <div>
              <span className="tag">NEAR HACKATHON · NFTs that do something</span>
              <h1 id="hero-title" className="display mt-5 text-[46px] leading-[0.98] sm:text-[72px] xl:text-[88px]">
                Four months of wages, already <RopeUnderline>on board.</RopeUnderline>
              </h1>
            </div>
            <div className="space-y-6">
              <p className="text-[18px] leading-relaxed text-[color:var(--slate)] sm:text-[19px]">Each berth on a ship is a NEAR account that is also an NFT. The shipowner fills it before anyone signs on. Only the crew member can empty it.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/judge" className="btn btn-lemon">Run the 4-minute voyage <ArrowRight size={18} aria-hidden /></Link>
                <Link href="/crew" className="btn btn-outline">See a berth</Link>
              </div>
              <HeroLive />
            </div>
          </div>
        </HeroPatch>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-20 sm:px-8 sm:pt-28" aria-labelledby="moment">
        <Heading n="01" kicker="The moment" title={<span id="moment">Day 74 at anchor off Khor Fakkan.</span>} />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
          <Reveal className="space-y-5 text-[18px] leading-[1.7] sm:text-[19px]">
            <p><strong>Arjun Nair</strong> (fictional), 31, able seaman from Kochi. It is 21:40 ship&apos;s time. His company has not paid wages for two months. Under the Maritime Labour Convention, two months unpaid already counts as abandonment.<sup><a href="#n1" className="text-[color:var(--flare)]">1</a></sup></p>
            <p>His sister&apos;s college fee is due on Friday. The ship&apos;s insurer is meant to cover up to four months of wages, but first he has to find out who the insurer is, file a claim from a ship with patchy internet, and wait. One insurer took {w.insurer_months_to_pay} months to accept liability.<sup><a href="#n2" className="text-[color:var(--flare)]">2</a></sup></p>
            <p>Arjun is fictional. In 2025, {fmt(w.seafarers_abandoned_2025)} real seafarers were abandoned on {w.ships_abandoned_2025} ships, owed US${(w.owed_usd_2025 / 1e6).toFixed(1)} million. Indian seafarers were the most abandoned group, {fmt(w.indian_seafarers_2025)} of them.<sup><a href="#n3" className="text-[color:var(--flare)]">3</a></sup></p>
          </Reveal>
          <Reveal delay={0.1} className="patch tint-sand self-start p-8">
            <p className="display text-[30px] leading-tight">&ldquo;The insurance is supposed to pay, eventually.&rdquo;</p>
            <p className="mt-4 text-[16px] text-[color:var(--slate)]">Berthright puts four months of his wages inside his berth before he ever signs on. His shipowner can fill it. His shipowner cannot empty it.</p>
            <dl className="mt-6 grid grid-cols-3 gap-3 [&>div]:flex [&>div]:flex-col-reverse">
              {[[fmt(w.seafarers_abandoned_2025), "abandoned, 2025"], [`$${(w.owed_usd_2025 / 1e6).toFixed(1)}M`, "wages owed"], [`${w.insurer_months_to_pay} mo`, "one insurer's wait"]].map(([v, k]) => (
                <div key={k}><dt className="mt-1 text-[12px] text-[color:var(--slate)]">{k}</dt><dd className="mono text-[22px] leading-none">{v}</dd></div>
              ))}
            </dl>
            <ol className="mt-6 space-y-1.5 text-[13px] text-[color:var(--slate)]">
              <li id="n1">1. MLC 2006 as amended, Standard A2.5.2 para 2(c).</li>
              <li id="n2">2. <a className="underline" href={LEG}>ITF submission to IMO, LEG 105/4/3 (2018)</a>.</li>
              <li id="n3">3. <a className="underline" href={ITF}>ITF, 2025 abandonment data</a>.</li>
            </ol>
          </Reveal>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1344px] scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32" aria-labelledby="how-title">
        <Heading n="02" kicker="How it works" title={<span id="how-title">Four moves, each one enforced by code.</span>} />
        <div className="mt-12">
          {STEPS.map((s, i) => (
            <article key={s.n} className={`patch ${s.tint} grid items-center gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:min-h-[min(560px,calc(100svh-140px))] lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-14 lg:motion-safe:sticky ${i < STEPS.length - 1 ? "mb-8 lg:motion-safe:mb-[24svh]" : "mb-2"}`} style={{ top: `${92 + i * 16}px` }}>
              <div>
                <div className="flex items-center gap-3"><span className="tag !bg-[color:var(--paper-hi)]">{s.n}</span><span className="eyebrow">{s.k}</span></div>
                <h3 className="display mt-5 text-[32px] leading-[1.05] sm:text-[44px]">{s.h}</h3>
                <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[color:var(--slate)] sm:text-[18px]">{s.p}</p>
              </div>
              <div className="mx-auto w-full max-w-[560px]">{s.art}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-24 sm:px-8 sm:pt-32">
        <Heading n="03" kicker="NFTs as accounts" title="The berth is the account." />
        <Reveal className="mt-10"><Anatomy /></Reveal>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-24 sm:px-8 sm:pt-32">
        <Heading n="04" kicker="Proof" title="Checked against real cases and the live chain." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <Reveal className="patch tint-kelp p-8 sm:p-10">
            <span className="tag !bg-[color:var(--paper-hi)]">Replay · {r?.window}</span>
            <p className="display mt-5 text-[84px] leading-none sm:text-[104px]">{r?.share_on_board_pct}%</p>
            <p className="mt-4 text-[18px] leading-relaxed">of the wages owed in {r?.cases_replayed} real abandonment cases ({fmt(r?.seafarers ?? 0)} seafarers) would already have been on board on the day abandonment began. Today that figure is 0%.</p>
            <p className="mt-3 text-[15px] text-[color:var(--slate)]">{r?.cases_partial_miss} cases owed more than four months and are named as partial misses; {r?.cases_excluded_missing_data} were excluded for missing data. Source: ITF abandonment list, retrieved {r?.retrieved}. Counted in crew-months.</p>
            <a href="https://github.com/0xkinno/berthright/blob/main/data/replay.json" className="stitch-link mt-5 inline-flex min-h-11 items-center gap-2 font-semibold">Every case, by vessel <ExternalLink size={15} aria-hidden /></a>
          </Reveal>
          <Reveal delay={0.1}>
            <LiveStats />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/proof" className="btn btn-ink">Recheck from chain <ArrowRight size={18} aria-hidden /></Link>
              <Link href="/findings" className="btn btn-outline">What moves at hand-over</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-24 sm:px-8 sm:pt-32">
        <Heading n="05" kicker="Break it" title="Every refusal is a real transaction." />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {breaks.map(([id, h], i) => {
            const b = R.break?.[id];
            return (
              <RevealItem key={id} delay={i * 0.05} className="patch glow-card flex h-full flex-col justify-between gap-5 p-7">
                  <p className="text-[18px] font-semibold leading-snug">{h}</p>
                  <div>
                    <p className="mono break-words text-[12px] text-[color:var(--mayday)]">{String(b?.decoded ?? "").split(":")[0] || "refused"}</p>
                    {b?.hash ? <a href={explorerTx(b.hash)} className="stitch-link mt-2 inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold">Refused on testnet <ExternalLink size={13} aria-hidden /></a> : null}
                  </div>
              </RevealItem>
            );
          })}
        </ul>
        <Link href="/break" className="btn btn-outline mt-8">All ten refusals</Link>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-24 sm:px-8 sm:pt-32">
        <Heading n="06" kicker="For shipowners" title="Why an honest operator opts in." />
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <Reveal>
            <ul className="grid gap-5 sm:grid-cols-2">
              {[
                ["Evidence that holds", "The reserve is visible on chain to crew, port state inspectors and charterers, every hour, not a certificate in a drawer."],
                ["Crew that sign", "Good seafarers choose ships where the money is already on board, and the berth keeps a sea-service record they own."],
                ["A portage bill that writes itself", "The master's wage account, per berth, read from chain, as CSV and as a printable PDF."],
                ["Surplus stays yours", "Anything above the reserves and earned wages can be withdrawn whenever wages are current."],
              ].map(([t, p]) => (
                <li key={t} className="patch p-6"><p className="font-semibold">{t}</p><p className="mt-2 text-[15px] leading-relaxed text-[color:var(--slate)]">{p}</p></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="hidden lg:block"><PortageArt /></Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1344px] px-4 pt-24 sm:px-8 sm:pt-32">
        <Reveal className="patch relative overflow-hidden !bg-[color:var(--ink)] px-8 py-14 text-[color:var(--paper-hi)] before:!border-[rgba(200,178,138,0.45)] sm:px-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="tag">Four minutes · no wallet</span>
              <h2 className="display mt-5 text-[38px] leading-[1.02] sm:text-[56px]">Sail the whole voyage yourself.</h2>
              <p className="mt-4 max-w-xl text-[17px] text-[#d8d2c4]">Your browser makes three keys. A real House of Stake berth is issued to your crew account. Watch a sign-on refused, wages land, the allotment go home, and the guarantee released, all on NEAR testnet.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/judge" className="btn btn-lemon">Start the voyage <ArrowRight size={18} aria-hidden /></Link>
              <Link href="/proof" className="btn border-2 border-[color:var(--paper-hi)] text-[color:var(--paper-hi)] hover:bg-[color:var(--paper-hi)] hover:text-[color:var(--ink)]">Proof from chain</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
