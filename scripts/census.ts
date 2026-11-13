// Collects real abandonment cases from the ITF's public abandonment list into data/cases.csv.
// Each row keeps its source URL and retrieval date. The joint IMO/ILO database refuses scripted
// access (HTTP 403 on 13 Nov 2026), so this list is our scripted ("wild") source.
// Usage: tsx scripts/census.ts [--from-file saved.html]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SOURCE = "https://www.itfseafarers.org/en/directories/abandonment-list";

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface Case {
  vessel: string; imo: string; flag: string; port: string; country: string;
  months_owed: number | null; seafarers: number | null; nationalities: string;
  reported: string; reported_year: number | null; status: string;
  source_url: string; retrieved: string; set: "wild";
}

export function parse(html: string, retrieved: string): Case[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const out: Case[] = [];
  for (const r of rows) {
    const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decode(m[1]));
    if (cells.length !== 10) continue;
    const [vessel, imo, flag, port, country, owed, crew, nationalities, reported, status] = cells;
    const m = owed.match(/([\d.]+)\s*month/i);
    const year = reported.match(/(\d{4})$/);
    out.push({
      vessel, imo, flag, port, country,
      months_owed: m ? Number(m[1]) : null,
      seafarers: /^\d+$/.test(crew) ? Number(crew) : null,
      nationalities, reported, reported_year: year ? Number(year[1]) : null, status,
      source_url: SOURCE, retrieved, set: "wild",
    });
  }
  return out;
}

async function main() {
  const i = process.argv.indexOf("--from-file");
  const retrieved = new Date().toISOString().slice(0, 10);
  const html = i > 0 ? readFileSync(process.argv[i + 1], "utf8") : await (await fetch(SOURCE, { headers: { "user-agent": "berthright-census/1.0" } })).text();
  const cases = parse(html, retrieved);
  if (cases.length === 0) throw new Error("no rows parsed: the page layout changed or the request was blocked");
  const cols = ["vessel", "imo", "flag", "port", "country", "months_owed", "seafarers", "nationalities", "reported", "reported_year", "status", "source_url", "retrieved", "set"] as const;
  mkdirSync("data", { recursive: true });
  const lines = [cols.join(","), ...cases.map((c) => cols.map((k) => csvCell((c as any)[k] ?? "")).join(","))];
  writeFileSync("data/cases.csv", lines.join("\n") + "\n");
  console.log(`wrote data/cases.csv: ${cases.length} cases from ${SOURCE} (retrieved ${retrieved})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
