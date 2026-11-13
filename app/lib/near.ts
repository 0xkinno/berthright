// NEAR access for the app: views with RPC failover, block-pinned berth reads, and two signers
// (a connected wallet via near-connect, or a browser key held in IndexedDB for the judge run).
import { NETWORK, RPC_URLS, APP_URL, IDS, MAINNET_RPC_URLS } from "./config";

export type Net = "testnet" | "mainnet";
const urls = (net: Net) => (net === "testnet" ? RPC_URLS : MAINNET_RPC_URLS);
let preferred = 0;
const cache = new Map<string, { at: number; value: unknown }>();

export class RpcDown extends Error {}

export async function rpc<T = any>(method: string, params: unknown, net: Net = NETWORK): Promise<T> {
  const list = urls(net);
  let last: unknown;
  for (let i = 0; i < list.length; i++) {
    const url = list[(preferred + i) % list.length];
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "berthright", method, params }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      const j = await res.json();
      if (j.error) {
        const msg = JSON.stringify(j.error);
        // A contract refusal or a missing account is an answer, not an outage.
        if (/UNKNOWN_ACCOUNT|CodeDoesNotExist|MethodResolveError|FunctionCallError|HostError|panicked|NoContractCode/i.test(msg)) throw Object.assign(new Error(msg), { answered: true });
        throw new Error(msg);
      }
      preferred = (preferred + i) % list.length;
      return j.result as T;
    } catch (e: any) {
      if (e?.answered) throw e;
      last = e;
    }
  }
  throw new RpcDown(`Every ${net} RPC failed: ${String((last as Error)?.message ?? last)}`);
}

function decodeResult(bytes: number[]): any {
  const text = new TextDecoder().decode(new Uint8Array(bytes));
  return text ? JSON.parse(text) : null;
}

export async function view<T = any>(contractId: string, method: string, args: object = {}, opts: { blockId?: string | number; net?: Net; ttlMs?: number } = {}): Promise<T> {
  const key = `${opts.net ?? NETWORK}|${contractId}|${method}|${JSON.stringify(args)}|${opts.blockId ?? "final"}`;
  const ttl = opts.ttlMs ?? 5000;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const r = await rpc<{ result: number[]; block_hash: string; block_height: number }>("query", {
    request_type: "call_function",
    account_id: contractId,
    method_name: method,
    args_base64: btoa(JSON.stringify(args)),
    ...(opts.blockId !== undefined ? { block_id: opts.blockId } : { finality: "final" }),
  }, opts.net);
  const value = decodeResult(r.result) as T;
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function finalBlock(net: Net = NETWORK) {
  const b = await rpc<{ header: { hash: string; height: number; timestamp_nanosec: string } }>("block", { finality: "final" }, net);
  return b.header;
}

export async function viewAccount(accountId: string, net: Net = NETWORK) {
  return rpc<{ amount: string; code_hash: string; storage_usage: number; global_contract_hash?: string; global_contract_account_id?: string }>("query", { request_type: "view_account", finality: "final", account_id: accountId }, net);
}

export async function accessKeys(accountId: string, net: Net = NETWORK) {
  const r = await rpc<{ keys: unknown[] }>("query", { request_type: "view_access_key_list", finality: "final", account_id: accountId }, net);
  return r.keys;
}

export interface ItemInfo { spec: string; init: boolean; status: string; collection_id: string; token_id: string; owner_id: string; rotation_seq: string; rotation_epoch: number }

/** The sharded-item rule for off-chain readers: both reads pinned to one block, refuse unless they agree. */
export async function pinnedBerth(berth: string, registry = IDS.registry, net: Net = NETWORK) {
  const block = await finalBlock(net);
  const [item, token] = await Promise.all([
    view<ItemInfo>(berth, "nft_item_info", {}, { blockId: block.hash, net, ttlMs: 0 }),
    view<{ token_id: string; owner_id: string } | null>(registry, "nft_token", { token_id: berth }, { blockId: block.hash, net, ttlMs: 0 }),
  ]);
  const agree = !!token && item.collection_id === registry && item.token_id === berth && token.token_id === berth && item.owner_id === token.owner_id;
  return { block, item, token, agree };
}

// ---------- transactions ----------

export interface FnCall { method: string; args: object; gasT?: number; deposit?: string }
export interface TxSpec { receiverId: string; actions: FnCall[] }
export interface Outcome { hash: string; ok: boolean; value: unknown; logs: string[]; failure: string | null }

export function parseOutcome(res: any): Outcome {
  const logs: string[] = [];
  let failure: string | null = null;
  for (const r of res?.receipts_outcome ?? []) {
    logs.push(...(r.outcome?.logs ?? []));
    const st = r.outcome?.status;
    if (st?.Failure && !failure) failure = JSON.stringify(st.Failure);
  }
  const st = res?.status ?? {};
  if (st.Failure) failure = JSON.stringify(st.Failure);
  let value: unknown = null;
  if (typeof st.SuccessValue === "string" && st.SuccessValue) {
    try { value = JSON.parse(atob(st.SuccessValue)); } catch { value = st.SuccessValue; }
  }
  const refused = logs.find((l) => l.startsWith("REFUSED:"));
  return { hash: res?.transaction?.hash ?? res?.transaction_outcome?.id ?? "", ok: !failure && !refused && value !== false, value, logs, failure: failure ?? (refused ? refused.slice(8) : null) };
}

export interface Signer {
  accountId: string;
  kind: "wallet" | "browser";
  send(specs: TxSpec[]): Promise<Outcome[]>;
}

// Browser keys live in IndexedDB; the server never sees them.
const DB = "berthright-keys";
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("keys");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function putKey(name: string, value: unknown) {
  const db = await idb();
  await new Promise<void>((res, rej) => { const tx = db.transaction("keys", "readwrite"); tx.objectStore("keys").put(value, name); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function getKey<T = any>(name: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction("keys", "readonly"); const r = tx.objectStore("keys").get(name); r.onsuccess = () => res(r.result as T); r.onerror = () => rej(r.error); });
}
export async function delKey(name: string) {
  const db = await idb();
  await new Promise<void>((res) => { const tx = db.transaction("keys", "readwrite"); tx.objectStore("keys").delete(name); tx.oncomplete = () => res(); });
}

export async function newBrowserKey(): Promise<{ publicKey: string; secretKey: string }> {
  const { KeyPair } = await import("near-api-js");
  const kp = KeyPair.fromRandom("ed25519");
  return { publicKey: kp.getPublicKey().toString(), secretKey: kp.toString() };
}

export async function browserSigner(accountId: string, secretKey: string): Promise<Signer> {
  const { Account, JsonRpcProvider, actions } = await import("near-api-js");
  const provider = new JsonRpcProvider({ url: RPC_URLS[0] });
  const acc = new Account(accountId, provider as never, secretKey as never);
  return {
    accountId,
    kind: "browser",
    async send(specs) {
      const out: Outcome[] = [];
      for (const s of specs) {
        try {
          const res = await acc.signAndSendTransaction({
            receiverId: s.receiverId,
            actions: s.actions.map((a) => actions.functionCall(a.method, a.args, BigInt(a.gasT ?? 100) * 10n ** 12n, BigInt(a.deposit ?? "0"))),
            waitUntil: "FINAL",
          } as never);
          out.push(parseOutcome(res));
        } catch (e: any) {
          out.push({ hash: e?.context?.transactionHash ?? "", ok: false, value: null, logs: [], failure: String(e?.message ?? e) });
        }
      }
      return out;
    },
  };
}

// ---------- wallet (near-connect) ----------

let connector: Promise<any> | null = null;
export function getConnector(): Promise<any> {
  if (typeof window === "undefined") throw new Error("WALLET_BROWSER_ONLY");
  connector ??= import("@hot-labs/near-connect").then(async ({ NearConnector }) => {
    const c = new NearConnector({
      network: NETWORK,
      providers: { [NETWORK]: RPC_URLS },
      features: NETWORK === "testnet" ? { testnet: true } : { mainnet: true },
      footerBranding: { heading: "Berthright", link: APP_URL, linkText: "Wages on board" },
      autoConnect: true,
    } as never);
    try { await c.whenManifestLoaded; } catch {}
    return c;
  });
  return connector;
}

function toConnectorTx(s: TxSpec) {
  return {
    receiverId: s.receiverId,
    actions: s.actions.map((a) => ({ type: "FunctionCall", params: { methodName: a.method, args: a.args, gas: (BigInt(a.gasT ?? 100) * 10n ** 12n).toString(), deposit: a.deposit ?? "0" } })),
  };
}

export async function walletSigner(): Promise<Signer | null> {
  const c = await getConnector();
  try {
    const { wallet, accounts } = await c.getConnectedWallet();
    if (!accounts?.length) return null;
    const accountId = accounts[0].accountId;
    return {
      accountId,
      kind: "wallet",
      async send(specs) {
        const txs = specs.map(toConnectorTx);
        if (wallet.manifest?.features?.signAndSendTransactions !== false && txs.length > 1) {
          const res = await wallet.signAndSendTransactions({ transactions: txs } as never);
          return (res as any[]).map(parseOutcome);
        }
        const out: Outcome[] = [];
        for (const t of txs) out.push(parseOutcome(await wallet.signAndSendTransaction(t as never)));
        return out;
      },
    };
  } catch {
    return null;
  }
}

// ---------- NEP-413 ----------

export const NOTICE_RECIPIENT = "berthright-crew-notices";

export interface Signed413 { accountId: string; publicKey: string; signature: string; message: string; nonce: string }

function b64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

/** Signs a NEP-413 message with the browser key, or asks the connected wallet to. */
export async function sign413(message: string, who: { kind: "browser"; accountId: string; secretKey: string } | { kind: "wallet" }): Promise<Signed413> {
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  if (who.kind === "browser") {
    const { Account, JsonRpcProvider } = await import("near-api-js");
    const { signMessage } = await import("near-api-js/nep413");
    const acc = new Account(who.accountId, new JsonRpcProvider({ url: RPC_URLS[0] }) as never, who.secretKey as never);
    const s: any = await signMessage({ signerAccount: acc, payload: { message, recipient: NOTICE_RECIPIENT, nonce } as never });
    return { accountId: who.accountId, publicKey: s.publicKey.toString(), signature: b64(s.signature), message, nonce: b64(nonce) };
  }
  const c = await getConnector();
  const wallet = await c.wallet();
  const s: any = await wallet.signMessage({ message, recipient: NOTICE_RECIPIENT, nonce } as never);
  const sig = typeof s.signature === "string" ? s.signature : b64(s.signature);
  return { accountId: s.accountId, publicKey: s.publicKey, signature: sig, message, nonce: b64(nonce) };
}
