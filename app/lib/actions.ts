// Transaction builders for every money move in Berthright. Each returns TxSpec[] for a Signer.
import { IDS } from "./config";
import type { TxSpec } from "./near";

const YOCTO = "1";
const milli = (n: number) => ((BigInt(Math.round(n * 1_000_000)) * 10n ** 24n) / 1_000_000n).toString();
const STORAGE = milli(0.00125);

export const SAMPLE_SEA_TEXT = "Seafarer Employment Agreement (sample, fictional). Rank: Able Seaman. Basic wage: 300 tUSD per month (10 tUSD per day). Contract: 9 months. Vessel: MV Kestrel (fictional).";

export async function sha256hex(text: string | ArrayBuffer): Promise<string> {
  const data = typeof text === "string" ? new TextEncoder().encode(text) : new Uint8Array(text);
  const h = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const tx = {
  faucet: (): TxSpec => ({ receiverId: IDS.tusd, actions: [{ method: "faucet", args: {}, gasT: 30 }] }),
  register: (accountId: string): TxSpec => ({ receiverId: IDS.tusd, actions: [{ method: "storage_deposit", args: { account_id: accountId, registration_only: true }, deposit: STORAGE, gasT: 30 }] }),
  createShip: (o: { name: string; imo: string; spd: number; graceDays: number; allowance: string }): TxSpec => ({
    receiverId: IDS.portage,
    actions: [{ method: "create_ship", args: { name: o.name, imo: o.imo, token: IDS.tusd, secs_per_day: String(o.spd), reserve_months: 4, grace_days: String(o.graceDays), repatriation_allowance: o.allowance }, deposit: milli(0.05), gasT: 50 }],
  }),
  openBerth: (shipId: string, berth: string, wage: string, days: number, seaHash: string): TxSpec => ({
    receiverId: IDS.portage,
    actions: [{ method: "open_berth", args: { ship_id: shipId, berth, daily_wage: wage, contract_days: String(days), sea_hash: seaHash }, deposit: milli(0.02), gasT: 50 }],
  }),
  fund: (shipId: string, amount: string): TxSpec => ({
    receiverId: IDS.tusd,
    actions: [{ method: "ft_transfer_call", args: { receiver_id: IDS.portage, amount, msg: JSON.stringify({ fund: shipId }) }, deposit: YOCTO, gasT: 100 }],
  }),
  signOn: (berth: string, wage: string, seaHash: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "sign_on", args: { berth, confirmed_daily_wage: wage, sea_hash: seaHash }, gasT: 100 }] }),
  settle: (berth: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "settle", args: { berth }, gasT: 100 }] }),
  addExtension: (berth: string, extension = IDS.allotment): TxSpec => ({
    receiverId: berth,
    actions: [{ method: "w_execute_extension", args: { request: { internal: [{ op: "add_extension", payload: { account_id: extension } }] } }, deposit: YOCTO, gasT: 60 }],
  }),
  grantSpend: (berth: string, receiver: string, budget: string, expiresNs: string): TxSpec => ({
    receiverId: berth,
    actions: [{ method: "hos_grant_spend", args: { extension: IDS.allotment, receivers: [receiver], budget_yocto: "0", tokens: [{ token: IDS.tusd, budget }], items: [], expires_at: expiresNs }, deposit: YOCTO, gasT: 60 }],
  }),
  setAllotment: (berth: string, receiver: string, amount: string, everySecs: number): TxSpec => ({
    receiverId: IDS.allotment,
    actions: [{ method: "set_allotment", args: { berth, token: IDS.tusd, receiver, amount, every_secs: String(everySecs) }, deposit: milli(0.01), gasT: 60 }],
  }),
  runAllotment: (berth: string): TxSpec => ({ receiverId: IDS.allotment, actions: [{ method: "run", args: { berth }, gasT: 160 }] }),
  declare: (shipId: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "declare_abandonment", args: { ship_id: shipId }, gasT: 60 }] }),
  release: (berth: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "release_guarantee", args: { berth }, gasT: 100 }] }),
  signOff: (berth: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "sign_off", args: { berth }, gasT: 100 }] }),
  withdraw: (shipId: string, amount: string): TxSpec => ({ receiverId: IDS.portage, actions: [{ method: "withdraw_surplus", args: { ship_id: shipId, amount }, gasT: 150 }] }),
  freeze: (berth: string): TxSpec => ({ receiverId: berth, actions: [{ method: "hos_freeze", args: {}, deposit: YOCTO, gasT: 30 }] }),
  unfreeze: (berth: string): TxSpec => ({ receiverId: berth, actions: [{ method: "hos_unfreeze", args: {}, deposit: YOCTO, gasT: 30 }] }),
  emptyBerth: (berth: string, to: string, amount: string): TxSpec => ({
    receiverId: berth,
    actions: [{
      method: "w_execute_extension",
      args: { request: { external: [{ receiver_id: IDS.tusd, actions: [{ action: "function_call", payload: { function_name: "ft_transfer", args: btoa(JSON.stringify({ receiver_id: to, amount, memo: "berth emptied at sign-off" })), deposit: "1", gas: "15000000000000" } }] }] } },
      deposit: YOCTO, gasT: 80,
    }],
  }),
  handOver: (berth: string, to: string): TxSpec => ({ receiverId: IDS.registry, actions: [{ method: "nft_transfer", args: { receiver_id: to, token_id: berth }, deposit: YOCTO, gasT: 250 }] }),
};

/** Sign off, move anything left in the berth to the crew member's own account, hand the NFT to the relief: one approval. */
export function signOffAndHandOver(berth: string, crew: string, relief: string, leftInBerth: string): TxSpec[] {
  const specs = [tx.signOff(berth)];
  if (BigInt(leftInBerth) > 0n) specs.push(tx.emptyBerth(berth, crew, leftInBerth));
  specs.push(tx.handOver(berth, relief));
  return specs;
}
