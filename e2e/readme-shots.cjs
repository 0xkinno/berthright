// Screenshots for the README, taken from the deployed app at 2x.
const { chromium } = require("playwright");
const BASE = process.env.BASE ?? "https://berthright-app.vercel.app";
const OUT = "docs/screens/";
const DEMO = "ab2-kestrel.crew.berthright.testnet";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const shot = async (path, name, opts = {}) => {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(opts.wait ?? 4500);
    if (opts.scroll) { await p.evaluate((y) => window.scrollTo(0, y), opts.scroll); await p.waitForTimeout(1500); }
    if (opts.before) await opts.before();
    await p.screenshot({ path: OUT + name + ".png" });
    console.log("saved", name);
  };
  await shot("/", "landing");
  await shot("/crew", "crew", { wait: 7000, before: async () => { await p.fill("#berth", DEMO); await p.waitForTimeout(6000); } });
  await shot("/ship/0", "ship", { wait: 7000 });
  await shot(`/berth/${DEMO}`, "berth", { wait: 7000 });
  await shot("/proof", "proof", { wait: 12000 });
  await shot("/break", "break");
  await shot("/", "how", { scroll: 2350 });
  const m = await b.newContext({ ...require("playwright").devices["iPhone 15"] });
  const mp = await m.newPage();
  await mp.goto(BASE + "/", { waitUntil: "networkidle" }); await mp.waitForTimeout(4500);
  await mp.screenshot({ path: OUT + "phone.png" }); console.log("saved phone");
  await b.close();
})();
