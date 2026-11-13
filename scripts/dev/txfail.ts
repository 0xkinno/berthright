const [hash, sender] = process.argv.slice(2);
const r: any = await (await fetch("https://archival-rpc.testnet.near.org", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "EXPERIMENTAL_tx_status", params: { tx_hash: hash, sender_account_id: sender, wait_until: "NONE" } }) })).json();
const fails = (r.result?.receipts_outcome ?? []).map((o: any) => JSON.stringify(o.outcome.status)).filter((s: string) => s.includes("Failure"));
const logs = (r.result?.receipts_outcome ?? []).flatMap((o: any) => o.outcome.logs).filter((l: string) => l.includes("stopped") || l.includes("REFUSED"));
console.log(hash.slice(0, 8), fails.map((f: string) => (f.match(/ExecutionError":"([^"]+)/) || [, f])[1].slice(0, 160)), logs.map((l: string) => l.slice(0, 160)));
