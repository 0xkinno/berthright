import { readFileSync } from "node:fs";
const log = readFileSync(process.argv[2], "utf8").trim().split("\n");
const links: string[] = JSON.parse(log[log.length - 1]);
for (const [i, u] of links.entries()) {
  const h = u.split("/").pop()!;
  const r: any = await (await fetch(`https://api-testnet.nearblocks.io/v3/txns/${h}`)).json().catch(() => null);
  const t = r?.data?.[0] ?? r?.data ?? {};
  const m = (t.actions ?? []).map((a: any) => a.method ?? a.action).join("+");
  console.log(i + 1, h, t.receiver_account_id ?? "", m, t.outcomes?.status === false ? "FAILED" : "");
}
