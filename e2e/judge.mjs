// End to end on NEAR testnet through the real UI: runs the whole /judge voyage in headless
// Chromium with browser keys, and asserts each checklist tick, which the page derives from chain reads.
// Usage: BASE=http://localhost:3100 node e2e/judge.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE ?? "http://localhost:3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(`${BASE}/judge`, { waitUntil: "load" });
const count = async () => Number((await p.locator("aside p.mono").first().innerText()).split("/")[0]);
async function step(i, wantCount, opts = {}) {
  const t0 = Date.now();
  for (let attempt = 0; attempt < (opts.retries ?? 1); attempt++) {
    await p.locator(`[data-tour=step-${i}] button`).first().click();
    const until = Date.now() + (opts.timeout ?? 120_000);
    while (Date.now() < until) {
      await sleep(3000);
      const busy = await p.locator("button:has(svg.animate-spin)").count();
      if (!busy && (await count()) >= wantCount) { console.log(`step ${i} ok (${wantCount}/8) in ${Math.round((Date.now() - t0) / 1000)}s`); return; }
      if (!busy && opts.retries && (await p.locator("[role=alert]").count())) break;
    }
    if (opts.wait) await sleep(opts.wait);
  }
  const alert = await p.locator("[role=alert]").allInnerTexts();
  console.log("STEP CARD:", (await p.locator(`[data-tour=step-${i}]`).innerText()).slice(0, 900));
  console.log("ASIDE:", (await p.locator("aside").first().innerText()).slice(0, 900));
  throw new Error(`step ${i} did not reach ${wantCount}/8: ${alert.join(" | ")}`);
}
await p.locator("[data-tour=step-0] button").first().click();
for (let k = 0; k < 40 && (await count()) < 1; k++) await sleep(3000);
console.log("step 0 ok", await count());
await step(1, 2);
await step(2, 3);
await step(3, 4);
await sleep(15000);
await step(4, 5);
await step(5, 6);
await step(6, 7);
await sleep(70000);
await step(7, 8, { retries: 6, wait: 20000, timeout: 60000 });
await p.screenshot({ path: "e2e/screens/judge-complete.png", fullPage: false });
const txLinks = await p.locator("a[href*='nearblocks.io/txns/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
console.log(`voyage complete: 8/8, ${txLinks.length} transaction links, page errors: ${errors.length}`);
console.log(JSON.stringify(txLinks.slice(0, 40)));
await b.close();
