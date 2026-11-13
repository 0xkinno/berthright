import { NextResponse } from "next/server";
import { IDS, RPC_URLS, MAINNET_RPC_URLS, DEPLOYED } from "@/lib/config";
import { ONECLICK } from "@/lib/intents";

export const dynamic = "force-dynamic";

async function probe(name: string, fn: () => Promise<string>) {
  const t = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t, detail };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t, detail: String((e as Error).message ?? e).slice(0, 200) };
  }
}

async function rpcStatus(url: string) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "status", params: [] }), cache: "no-store", signal: AbortSignal.timeout(6000) });
  const j = await r.json();
  return `height ${j.result.sync_info.latest_block_height}, chain ${j.result.chain_id}`;
}

async function viewProbe(contract: string, method: string, args: object = {}) {
  if (!contract) throw new Error("not deployed yet");
  const r = await fetch(RPC_URLS[0], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "call_function", finality: "final", account_id: contract, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString("base64") } }), cache: "no-store", signal: AbortSignal.timeout(6000) });
  const j = await r.json();
  if (j.error || j.result?.error) throw new Error(JSON.stringify(j.error ?? j.result.error).slice(0, 160));
  return `${contract}.${method} answered`;
}

export async function GET() {
  const fault = process.env.BERTHRIGHT_FAULT ?? null;
  const probes = await Promise.all([
    ...RPC_URLS.map((u, i) => probe(`testnet RPC ${i + 1} (${new URL(u).host})`, () => (fault === "stale_rpc" && i === 0 ? Promise.reject(new Error("Fault switch on: first RPC marked stale")) : rpcStatus(u)))),
    probe("mainnet RPC", () => rpcStatus(MAINNET_RPC_URLS[0])),
    probe("portage (wage chest)", () => viewProbe(IDS.portage, "config")),
    probe("allotment", () => viewProbe(IDS.allotment, "stats")),
    probe("House of Stake registry", () => viewProbe(IDS.registry, "nft_metadata")),
    probe("tUSD", () => viewProbe(IDS.tusd, "ft_metadata")),
    probe("NEAR Intents 1Click", async () => {
      const r = await fetch(`${ONECLICK}/tokens`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return `${(await r.json()).length} tokens listed`;
    }),
    probe("NEAR AI Cloud (contract reader)", async () => {
      if (fault === "ai_down") throw new Error("Fault switch on: contract reading marked down");
      if (!process.env.NEARAI_API_KEY) throw new Error("No NEAR AI key configured: crew type the wage from their contract instead");
      const r = await fetch("https://cloud-api.near.ai/v1/models", { headers: { authorization: `Bearer ${process.env.NEARAI_API_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return `${((await r.json()).data ?? []).length} models listed`;
    }),
  ]);
  return NextResponse.json({
    measured_at: new Date().toISOString(),
    deployed: DEPLOYED,
    fault_switch: fault,
    substitutes: [],
    probes,
  });
}
