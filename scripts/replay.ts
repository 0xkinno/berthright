// Counterfactual replay over data/cases.csv. Without Berthright the crew had 0 months of wages on
// board on the day abandonment began. With Berthright each crew member had min(months_owed, 4)
// months locked in the chest, releasable at once. We count in crew-months because the ITF list
// gives months owed and crew size, not amounts. Writes data/replay.json.
import { readFileSync, writeFileSync } from "node:fs";

const COVER_MONTHS = 4;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { cur.push(cell); cell = ""; }
    else if (ch === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
    else cell += ch;
  }
  if (cell || cur.length) { cur.push(cell); rows.push(cur); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

export function replay(rows: Record<string, string>[], years?: number[]) {
  const inWindow = rows.filter((r) => !years || years.includes(Number(r.reported_year)));
  const usable = inWindow.filter((r) => r.months_owed !== "" && r.seafarers !== "" && Number(r.seafarers) > 0);
  const excluded = inWindow.length - usable.length;
  let owed = 0, covered = 0, seafarers = 0;
  const full: string[] = [], partial: { vessel: string; imo: string; months_owed: number; seafarers: number; uncovered_crew_months: number }[] = [];
  for (const r of usable) {
    const m = Number(r.months_owed), n = Number(r.seafarers);
    owed += m * n;
    covered += Math.min(m, COVER_MONTHS) * n;
    seafarers += n;
    if (m <= COVER_MONTHS) full.push(r.vessel);
    else partial.push({ vessel: r.vessel, imo: r.imo, months_owed: m, seafarers: n, uncovered_crew_months: (m - COVER_MONTHS) * n });
  }
  partial.sort((a, b) => b.uncovered_crew_months - a.uncovered_crew_months);
  return {
    window: years ?? "all",
    cases_in_window: inWindow.length,
    cases_replayed: usable.length,
    cases_excluded_missing_data: excluded,
    seafarers,
    crew_months_owed: owed,
    crew_months_on_board_with_berthright: covered,
    crew_months_on_board_without: 0,
    share_on_board_pct: owed ? Math.round((covered / owed) * 1000) / 10 : 0,
    cases_fully_covered: full.length,
    cases_partial_miss: partial.length,
    partial_misses: partial,
    over_release_cases: 0,
    over_release_note: "Impossible by construction: release pays only wages owed up to the contract end, capped at the reserve (test release_never_pays_more_than_is_owed).",
  };
}

function main() {
  const rows = parseCsv(readFileSync("data/cases.csv", "utf8"));
  const report = {
    source: rows[0]?.source_url,
    retrieved: rows[0]?.retrieved,
    set: "wild: ITF public abandonment list (open cases at retrieval); scripted by scripts/census.ts",
    bias_note: "The list shows cases open on the retrieval date, which leans towards longer, unresolved cases. Months owed are as reported to the ITF, rounded by the ITF.",
    cover_months: COVER_MONTHS,
    window_2023_2025: replay(rows, [2023, 2024, 2025]),
    all_listed: replay(rows),
  };
  writeFileSync("data/replay.json", JSON.stringify(report, null, 2) + "\n");
  const w = report.window_2023_2025;
  console.log(`2023 to 2025: ${w.cases_replayed} cases replayed (${w.cases_excluded_missing_data} excluded), ${w.seafarers} seafarers.`);
  console.log(`On board on day one with Berthright: ${w.share_on_board_pct}% of owed crew-months (without: 0%).`);
  console.log(`Fully covered: ${w.cases_fully_covered}. Partial misses: ${w.cases_partial_miss}, largest: ${w.partial_misses.slice(0, 3).map((p) => `${p.vessel} (${p.months_owed} months, ${p.seafarers} crew)`).join("; ")}`);
  console.log(`All listed years: ${report.all_listed.cases_replayed} cases, ${report.all_listed.share_on_board_pct}% on board.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
