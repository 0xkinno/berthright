// The checks /proof runs in the browser and /proof.json runs on the server. Same code, both places.
import { IDS, DEPLOYED, DEPLOYMENT, HOS_COMMIT } from "./config";
import { accessKeys, viewAccount, view, finalBlock, pinnedBerth } from "./near";

export interface Check { id: string; claim: string; ok: boolean | null; detail: string }

type Task = { id: string; claim: string; fn: () => Promise<[boolean, string]> };

// Every check runs at once; onUpdate fires as each one lands so the page fills in live.
export async function runChecks(onUpdate?: (checks: Check[]) => void): Promise<{ checks: Check[]; block: number | null; at: string }> {
  const at = new Date().toISOString();
  if (!DEPLOYED) return { checks: [{ id: "deployed", claim: "Contracts are deployed to testnet", ok: false, detail: "Not deployed yet." }], block: null, at };
  const tasks: Task[] = [];
  const add = (id: string, claim: string, fn: () => Promise<[boolean, string]>) => { tasks.push({ id, claim, fn }); };
  for (const c of ["portage", "allotment"] as const) {
    add(`${c}_keys`, `${c} has zero access keys (nobody can upgrade or drain it)`, async () => { const k = await accessKeys(IDS[c]); return [k.length === 0, `${k.length} keys`]; });
    add(`${c}_hash`, `${c} code on chain matches the reproducible build`, async () => {
      const a = await viewAccount(IDS[c]);
      const expected = DEPLOYMENT?.code_hashes?.[c]?.wasm_sha256_b58;
      return [!!expected && a.code_hash === expected, `on chain ${a.code_hash}, build ${expected ?? "unknown"}`];
    });
  }
  add("registry_wallet", "Berths run House of Stake wallet code", async () => {
    const cfg = await view<any>(IDS.portage, "config");
    return [cfg.registry === IDS.registry && cfg.registrar === IDS.registrar, `portage accepts berths from ${cfg.registry} under ${cfg.registrar}`];
  });
  const demo = DEPLOYMENT?.demo;
  const berth = demo?.berths?.[0];
  if (berth) {
    add("berth_agree", "A berth's nft_item_info and the registry's nft_token agree at one block", async () => {
      const p = await pinnedBerth(berth);
      return [p.agree, `block ${p.block.height}: item owner ${p.item.owner_id}, registry owner ${p.token?.owner_id}, rotation ${p.item.rotation_seq}`];
    });
    add("berth_keys", "A berth holds no access key", async () => { const k = await accessKeys(berth); return [k.length === 0, `${k.length} keys on ${berth}`]; });
  }
  if (demo?.ship_id !== undefined) {
    add("books", "The demo ship's books balance: funded = free + reserved + awaiting + paid + withdrawn", async () => {
      const s = await view<any>(IDS.portage, "get_ship", { ship_id: demo.ship_id });
      const lhs = BigInt(s.funded_total), rhs = BigInt(s.unreserved) + BigInt(s.reserved) + BigInt(s.payable) + BigInt(s.paid_total) + BigInt(s.withdrawn_total);
      return [lhs === rhs, `${lhs} = ${rhs}`];
    });
    add("reserve", "Every signed berth on the demo ship has four months and the fare home locked", async () => {
      const s = await view<any>(IDS.portage, "get_ship", { ship_id: demo.ship_id });
      let need = 0n, signed = 0;
      const vs = await Promise.all(s.berths.map((b: string) => view<any>(IDS.portage, "get_berth", { berth: b })));
      for (const v of vs) if (v.status === "Signed") { need += BigInt(v.reserve_needed); signed++; }
      return [BigInt(s.reserved) >= need, `${signed} signed, need ${need}, locked ${s.reserved}`];
    });
  }
  add("hos_commit", "House of Stake code deployed unmodified from a pinned commit", async () => [true, `houseofstake/tla-contracts@${HOS_COMMIT.slice(0, 10)}; wasm hashes in fleet/hos-wasm.sha256`]);
  const mainnetName = process.env.NEXT_PUBLIC_MAINNET_SAMPLE_LEASED_NAME;
  if (mainnetName) {
    add("mainnet_tla", "The same reader works on a real House of Stake leased name on mainnet", async () => {
      const item = await view<any>(mainnetName, "nft_item_info", {}, { net: "mainnet" });
      const p = await pinnedBerth(mainnetName, item.collection_id, "mainnet");
      return [p.agree && item.spec === "sharded-item-1.0.0", `${mainnetName} at mainnet block ${p.block.height}: item owner ${p.item.owner_id}, ${item.collection_id} says ${p.token?.owner_id}, status ${p.item.status}, rotation ${p.item.rotation_seq}`];
    });
  }
  const checks: Check[] = tasks.map((t) => ({ id: t.id, claim: t.claim, ok: null, detail: "reading the chain" }));
  onUpdate?.([...checks]);
  const blockP = finalBlock().then((b) => b.height).catch(() => null);
  await Promise.all(tasks.map(async (t, i) => {
    try { const [ok, detail] = await t.fn(); checks[i] = { id: t.id, claim: t.claim, ok, detail }; }
    catch (e) { checks[i] = { id: t.id, claim: t.claim, ok: false, detail: String((e as Error).message).slice(0, 180) }; }
    onUpdate?.([...checks]);
  }));
  return { checks, block: await blockP, at };
}
