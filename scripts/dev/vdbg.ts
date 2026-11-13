const NB = "https://api-testnet.nearblocks.io/v3";
for (const acc of ["portage.berthright.testnet", "tusd.berthright.testnet"]) {
  let next: string | undefined, n = 0, pages = 0; const methods: Record<string, number> = {};
  do {
    const j: any = await (await fetch(`${NB}/accounts/${acc}/txns?limit=100${next ? `&next=${encodeURIComponent(next)}` : ""}`)).json();
    for (const t of j.data ?? []) { n++; for (const a of t.actions ?? []) methods[a.method ?? a.action] = (methods[a.method ?? a.action] ?? 0) + 1; }
    next = j.meta?.next_page; pages++;
  } while (next && pages < 20);
  console.log(acc, n, "txs", methods);
}
