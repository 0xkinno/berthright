import deployment from "./generated/deployment.json";

type Dep = {
  portage?: string; allotment?: string; tusd?: string; registry?: string; registrar?: string;
  trust?: string; root?: string; hos_commit?: string; code_hashes?: Record<string, { wasm_sha256_b58?: string; on_chain?: string }>;
  demo?: { ship_id?: string; berths?: string[]; owner?: string; crew?: string; family?: string };
  txs?: Record<string, string>;
} | null;

const dep = deployment as Dep;
const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);

export const NETWORK = (env("NEXT_PUBLIC_NETWORK") ?? "testnet") as "testnet" | "mainnet";
export const RPC_URLS = (env("NEXT_PUBLIC_RPC_URLS") ?? "https://rpc.testnet.fastnear.com,https://test.rpc.fastnear.com,https://rpc.testnet.near.org").split(",");
export const MAINNET_RPC_URLS = (env("NEXT_PUBLIC_MAINNET_RPC_URLS") ?? "https://free.rpc.fastnear.com,https://rpc.mainnet.fastnear.com,https://rpc.mainnet.near.org").split(",");
export const APP_URL = env("NEXT_PUBLIC_APP_URL") ?? "https://berthright-app.vercel.app";

export const IDS = {
  portage: env("NEXT_PUBLIC_PORTAGE_ID") ?? dep?.portage ?? "",
  allotment: env("NEXT_PUBLIC_ALLOTMENT_ID") ?? dep?.allotment ?? "",
  tusd: env("NEXT_PUBLIC_TUSD_ID") ?? dep?.tusd ?? "",
  registry: env("NEXT_PUBLIC_REGISTRY_ID") ?? dep?.registry ?? "",
  registrar: env("NEXT_PUBLIC_REGISTRAR_ID") ?? dep?.registrar ?? "",
};
export const DEPLOYED = Boolean(IDS.portage && IDS.allotment && IDS.tusd && IDS.registry && IDS.registrar);
export const DEPLOYMENT = dep;
export const DEMO = dep?.demo ?? null;
export const HOS_COMMIT = dep?.hos_commit ?? "d85860a8cc2bfcb8b617b28cab558da5d39333fc";
export const REPO = "https://github.com/0xkinno/berthright";
export const TUSD_DECIMALS = 6;

export function explorerTx(hash: string) {
  return NETWORK === "testnet" ? `https://testnet.nearblocks.io/txns/${hash}` : `https://nearblocks.io/txns/${hash}`;
}
export function explorerAccount(id: string) {
  return NETWORK === "testnet" ? `https://testnet.nearblocks.io/address/${id}` : `https://nearblocks.io/address/${id}`;
}
