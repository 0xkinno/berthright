// NEAR Intents 1Click client. Mainnet only (Intents has no testnet); we only ask for dry quotes.
// Field names from https://docs.near-intents.org/llms.txt (Making a Request), read 13 Nov 2026.
export const ONECLICK = "https://1click.chaindefuser.com/v0";
export const USDC_NEAR = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
export const DESTINATIONS: Record<string, { assetId: string; label: string; sample: string }> = {
  base: { assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", label: "USDC on Base", sample: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  arb: { assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", label: "USDC on Arbitrum", sample: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  near: { assetId: USDC_NEAR, label: "USDC on NEAR", sample: "near" },
};

function headers(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (process.env.ONECLICK_JWT) h.authorization = `Bearer ${process.env.ONECLICK_JWT}`;
  return h;
}

export async function dryQuote(opts: { amount: string; dest: keyof typeof DESTINATIONS; recipient?: string; origin?: string }) {
  const d = DESTINATIONS[opts.dest];
  const body = {
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: opts.origin ?? USDC_NEAR,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: d.assetId,
    amount: opts.amount,
    recipient: opts.recipient || d.sample,
    recipientType: "DESTINATION_CHAIN",
    refundTo: "near",
    refundType: "ORIGIN_CHAIN",
    deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  const res = await fetch(`${ONECLICK}/quote`, { method: "POST", headers: headers(), body: JSON.stringify(body), cache: "no-store" });
  const j = await res.json();
  if (!res.ok || !j.quote) throw new Error(j.message ?? `1Click answered ${res.status}`);
  return { quote: j.quote, signature: j.signature, timestamp: j.timestamp, destination: d.label, jwt: Boolean(process.env.ONECLICK_JWT) };
}

export async function nearPriceUsd(): Promise<{ price: number; at: string } | null> {
  const res = await fetch(`${ONECLICK}/tokens`, { cache: "no-store" });
  if (!res.ok) return null;
  const t = (await res.json()) as { assetId: string; price: number; priceUpdatedAt: string }[];
  const w = t.find((x) => x.assetId === "nep141:wrap.near");
  return w ? { price: w.price, at: w.priceUpdatedAt } : null;
}
