import Link from "next/link";
import facts from "@/lib/generated/facts.json";
import { ShipArt } from "@/components/ShipArt";
import { GlowCard } from "@/components/GlowCard";
import { Anatomy } from "@/components/Anatomy";
import { LiveStats } from "@/components/LiveStats";
import { LockArt, TideArt, EnvelopeArt, FlareArt, PortageArt } from "@/components/Art";
import { ArrowRight, ExternalLink } from "lucide-react";

const F = facts as any;
const fmt = (n: number) => n.toLocaleString("en-US");
const ITF = "https://www.itfseafarers.org/en/news/seafarer-abandonment-crisis-thousands-left-behind-shippings-worst-year-record";
const LEG = "https://www.itfglobal.org/sites/default/files/node/resources/files/2018%20LEG%20105-4-3%20-%20Implementation%20of%20the%20financial%20security%20requirement%20under%20MLC%2C%202006%2C%20as%20amended%2C%20for%20the...%20%28ITF%29.pdf";

function Section({ n, title, id, children }: { n: string; title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20">
      <div aria-hidden className="absolute left-0 top-16 hidden h-40 w-3 flex-col justify-between xl:flex">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className="block h-px w-full bg-[color:var(--brass-soft)] opacity-60" style={{ width: i % 4 === 0 ? 12 : 6 }} />)}
      </div>
      <p className="eyebrow">Nº {n}</p>
      <h2 className="display mt-2 max-w-3xl text-[36px] font-bold leading-[1.05] sm:text-[52px]">{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export default function Home() {
  const w = F.world;
  const r = F.replay;
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-12" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">NEAR HACKATHON · NFTs that do something</p>
          <h1 id="hero-title" className="display mt-4 text-[52px] font-extrabold leading-[0.95] sm:text-[72px] xl:text-[88px]">Four months of wages, already on board.</h1>
          <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-[color:var(--slate)] sm:text-[20px]">Berthright turns each berth on a ship into a NEAR account. The shipowner fills it before anyone signs on. Only the crew member can empty it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/crew" className="btn btn-lemon">See a berth <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/judge" className="btn btn-outline">For judges: 4-minute run</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Sourced figures">
            <li><a href={ITF} className="pill min-h-9 border border-[color:var(--hair)] bg-[color:var(--paper-hi)] !normal-case !tracking-normal text-[color:var(--ink)]">{fmt(w.seafarers_abandoned_2025)} seafarers abandoned in 2025</a></li>
            <li><a href={ITF} className="pill min-h-9 border border-[color:var(--hair)] bg-[color:var(--paper-hi)] !normal-case !tracking-normal text-[color:var(--ink)]">US${(w.owed_usd_2025 / 1e6).toFixed(1)}M in wages owed</a></li>
            <li><span className="pill min-h-9 bg-[color:var(--ink)] !normal-case !tracking-normal text-[color:var(--lemon)]">{F.product.reserve_months_min} months on board, every berth</span></li>
          </ul>
        </div>
        <ShipArt months={F.product.reserve_months_min} />
      </section>

      <Section n="01" title="Day 74 at anchor off Khor Fakkan.">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5 text-[18px] leading-relaxed sm:text-[19px]">
            <p><strong>Arjun Nair</strong> (fictional), 31, able seaman from Kochi. It is 21:40 ship&apos;s time. His company has not paid wages for two months. Under the Maritime Labour Convention, two months unpaid already counts as abandonment.<sup><a href="#n1" className="text-[color:var(--brass)]">1</a></sup></p>
            <p>His sister&apos;s college fee is due on Friday. The ship&apos;s insurer is meant to cover up to four months of wages, but first he has to find out who the insurer is, file a claim from a ship with patchy internet, and wait. One insurer took {w.insurer_months_to_pay} months to accept liability.<sup><a href="#n2" className="text-[color:var(--brass)]">2</a></sup></p>
            <p>Arjun is fictional. In 2025, {fmt(w.seafarers_abandoned_2025)} real seafarers were abandoned on {w.ships_abandoned_2025} ships, owed US${(w.owed_usd_2025 / 1e6).toFixed(1)} million. Indian seafarers were the most abandoned group, {fmt(w.indian_seafarers_2025)} of them.<sup><a href="#n3" className="text-[color:var(--brass)]">3</a></sup></p>
          </div>
          <aside className="card self-start p-7">
            <p className="display text-[28px] font-bold leading-tight">&ldquo;The insurance is supposed to pay, eventually.&rdquo;</p>
            <p className="mt-4 text-[15px] text-[color:var(--slate)]">Berthright puts four months of his wages inside his berth before he ever signs on. His shipowner can fill it. His shipowner cannot empty it.</p>
            <ol className="mt-6 space-y-2 text-[13px] text-[color:var(--slate)]">
              <li id="n1">1. MLC 2006 as amended, Standard A2.5.2 para 2(c).</li>
              <li id="n2">2. <a className="underline" href={LEG}>ITF submission to IMO, LEG 105/4/3 (2018)</a>.</li>
              <li id="n3">3. <a className="underline" href={ITF}>ITF, 2025 abandonment data</a>.</li>
            </ol>
          </aside>
        </div>
      </Section>

      <Section n="02" title="How it works, in four moves." id="how">
        <ul className="grid gap-5 sm:grid-cols-2">
          {[
            { art: <LockArt />, h: "Reserve before sign-on", p: "The shipowner locks four months of the berth's wages and the fare home in the wage chest. No reserve, no sign-on: the contract refuses." },
            { art: <TideArt />, h: "Wages every day", p: "Wages accrue by the second and anyone may settle them into the berth. A scheduled job does it every ten minutes. Nobody presses a button." },
            { art: <EnvelopeArt />, h: "The allotment, fenced", p: "Arjun grants the allotment contract a spend fence on his berth: this receiver, this token, this much, until then. NEAR's own wallet code enforces it." },
            { art: <FlareArt />, h: "If the owner stops paying", p: "After a 14-day grace (MLC allows two months), anyone can declare the ship abandoned and release each crew member's four months to their own account." },
          ].map((c) => (
            <GlowCard as="li" key={c.h}>
              {c.art}
              <h3 className="display mt-5 text-[26px] font-bold">{c.h}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[color:var(--slate)]">{c.p}</p>
            </GlowCard>
          ))}
        </ul>
      </Section>

      <Section n="03" title="The berth is the account.">
        <Anatomy />
      </Section>

      <Section n="04" title="Proof, from the chain and from real cases.">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="card p-7">
            <p className="eyebrow">Replay of real cases · {r?.window}</p>
            <p className="mono mt-3 text-[56px] font-medium leading-none">{r?.share_on_board_pct}%</p>
            <p className="mt-3 text-[17px] leading-relaxed">of the wages owed in {r?.cases_replayed} real abandonment cases ({fmt(r?.seafarers ?? 0)} seafarers) would already have been on board on the day abandonment began. Today that figure is 0%.</p>
            <p className="mt-3 text-[15px] text-[color:var(--slate)]">{r?.cases_partial_miss} cases owed more than four months: partial misses, named in the report. {r?.cases_excluded_missing_data} cases excluded for missing data. Source: ITF abandonment list, retrieved {r?.retrieved}. Counted in crew-months owed.</p>
            <a href="https://github.com/0xkinno/berthright/blob/main/data/replay.json" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline">Every case, named <ExternalLink size={15} aria-hidden /></a>
          </div>
          <div>
            <LiveStats />
            <Link href="/proof" className="btn btn-ink mt-6">Recheck from chain <ArrowRight size={18} aria-hidden /></Link>
          </div>
        </div>
      </Section>

      <Section n="05" title="Try to break it.">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Owner withdraws the reserve", "E_RESERVE_LOCKED"],
            ["Sign on at a lower wage than the contract", "E_WAGE_DIFFERS_FROM_YOUR_CONTRACT"],
            ["Declare abandonment early", "E_NOT_YET_ABANDONED"],
            ["A stranger signs on", "E_NOT_BERTH_HOLDER"],
            ["Old holder's allotment after hand-over", "E_BERTH_CHANGED_HANDS"],
            ["Allotment over the budget", "TOKEN_CAP_EXCEEDED"],
          ].map(([h, code]) => (
            <li key={code} className="card flex flex-col justify-between gap-4 p-6">
              <p className="text-[17px] font-semibold">{h}</p>
              <p className="mono text-[13px] text-[color:var(--mayday)]">{code}</p>
            </li>
          ))}
        </ul>
        <Link href="/break" className="btn btn-outline mt-6">See each refusal on chain</Link>
      </Section>

      <Section n="06" title="Why an honest shipowner opts in.">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <ul className="space-y-5 text-[18px] leading-relaxed">
            <li><strong>Evidence that holds.</strong> The reserve is visible on chain to crew, port state inspectors and charterers, every hour, not a certificate in a drawer.</li>
            <li><strong>Crew that sign.</strong> Good seafarers choose ships where the money is already on board. The berth carries a sea-service record they keep.</li>
            <li><strong>A portage bill that writes itself.</strong> The master&apos;s wage account, per berth, per month, from chain, as CSV and PDF.</li>
            <li><strong>Surplus stays yours.</strong> Anything above the reserves and earned wages can be withdrawn whenever wages are current.</li>
          </ul>
          <PortageArt />
        </div>
      </Section>
    </>
  );
}
