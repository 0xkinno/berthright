// Stands up the whole Berthright testnet fleet under ROOT (default berthright.testnet):
// the House of Stake TLA fleet (wasm built unmodified by fleet/build-hos.sh), the crew namespace,
// tUSD, portage and allotment. Idempotent: every step checks chain state first and skips if done.
// Keys go to ~/.near-credentials/testnet only. Writes deployments/testnet.json.
import { KeyPair, actions } from "near-api-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import bs58 from "bs58";
import { account, call, exists, loadKey, saveKey, view, balance, accessKeys, codeHash, milli, NEAR, ONE_YOCTO, explorerTx } from "../scripts/lib/near.ts";

const ROOT = process.env.ROOT_ACCOUNT ?? "berthright.testnet";
// PHASE=ours deploys tusd, portage, allotment only (about 8 NEAR). PHASE=hos adds the House of
// Stake fleet (about 60 NEAR, 43 of it the wallet's global publish). Default: both.
const PHASE = process.env.PHASE ?? "all";
const DO_HOS = PHASE !== "ours";
const HOS = (n: string) => readFileSync(`fleet/wasm/${n}.wasm`);
const OURS = (n: string) => readFileSync(`target/near/${n}/${n}.wasm`);
const sha256b58 = (b: Buffer) => bs58.encode(createHash("sha256").update(b).digest());
const sha256hex = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const log = (...a: unknown[]) => console.log(...a);
const txs: Record<string, string> = {};

const root = account(ROOT);

async function ensure(label: string, near: number) {
  const acc = `${label}.${ROOT}`;
  if (await exists(acc)) {
    if (!loadKey(acc)) throw new Error(`${acc} exists but its key is not in ~/.near-credentials`);
    log(`  reuse ${acc}`);
    return account(acc);
  }
  const kp = KeyPair.fromRandom("ed25519");
  await root.createSubAccount({ accountOrPrefix: acc, publicKey: kp.getPublicKey(), nearToTransfer: milli(near) } as never);
  saveKey(acc, kp);
  log(`  created ${acc} with ${near} NEAR`);
  return account(acc);
}

async function must(signer: ReturnType<typeof account>, to: string, m: string, args: object, deposit = 0n, label?: string) {
  const r = await call(signer, to, m, args, { deposit });
  if (!r.ok) throw new Error(`${m} on ${to} failed: ${r.failure} ${r.hash}`);
  if (label) txs[label] = r.hash;
  return r;
}

async function hasState(acc: string, viewMethod: string, args: object = {}) {
  try { await view(acc, viewMethod, args); return true; } catch { return false; }
}

async function deploy(signer: ReturnType<typeof account>, code: Buffer) {
  const current = await codeHash(signer.accountId);
  if (current === sha256b58(code)) return false;
  await signer.signAndSendTransaction({ receiverId: signer.accountId, actions: [actions.deployContract(code)], waitUntil: "FINAL" } as never);
  return true;
}

async function main() {
  const rootBal = await balance(ROOT);
  log(`root ${ROOT}: ${Number(rootBal / 10n ** 21n) / 1000} NEAR`);

  log("\n== accounts ==");
  // Lean balances: each covers its contract's storage plus a small float.
  const tusd = await ensure("tusd", 2.4);
  const portage = await ensure("portage", 3.2);
  const allotment = await ensure("allotment", 2.3);
  const id = (l: string) => `${l}.${ROOT}`;
  const registryId = id("registry"), crewId = id("crew");
  let walletHash = sha256b58(HOS("hos_wallet"));
  if (DO_HOS) {
    const impl = await ensure("impl", 0.3);
    const council = await ensure("council", 0.5);
    const registry = await ensure("registry", 7.5);
    const ext = await ensure("ext", 3.3);
    const rec = await ensure("rec", 0.1); // an address the registry and extension name; recovery code is not deployed
    const crew = await ensure("crew", 2.3);
    const trust = await ensure("trust", 1.5);

    log("\n== wallet code, published once as a global contract (by account id, as the registrar expects) ==");
    const walletWasm = HOS("hos_wallet");
    const prev = existsSync("deployments/testnet.json") ? JSON.parse(readFileSync("deployments/testnet.json", "utf8")) : {};
    if (process.env.SKIP_WALLET === "1") {
      log("  skipped for now (SKIP_WALLET=1): berths cannot be issued until the wallet code is published");
      walletHash = prev.wallet_global_hash ?? "";
    } else if (prev.wallet_global_hash !== walletHash) {
      const cost = BigInt(walletWasm.length) * 100_000_000_000_000_000_000n + milli(0.3);
      const held = await balance(impl.accountId);
      if (held < cost) await root.transfer({ token: (await import("near-api-js/tokens")).NEAR, amount: cost - held, receiverId: impl.accountId } as never);
      const r: any = await impl.deployGlobalContract(walletWasm, "accountId");
      txs.publish_wallet = r?.transaction?.hash ?? r?.transaction_outcome?.id ?? "";
      log(`  published ${walletHash} (${walletWasm.length} bytes)`);
    } else log(`  already published ${walletHash}`);

    log("\n== registrar on the crew namespace ==");
    if (await deploy(crew, HOS("registrar"))) log("  registrar code deployed");
    if (!(await hasState(crew.accountId, "min_balance"))) {
      await must(crew, crew.accountId, "new", { config: {
        registry: registry.accountId, council: council.accountId, wallet_impl: impl.accountId,
        hos_extension: ext.accountId, recovery: rec.accountId, chain_id: "testnet",
        min_balance: milli(0.1).toString(), wallet_timeout_secs: 3600 } });
    }

    log("\n== hos-extension, tla-registry ==");
    if (await deploy(ext, HOS("hos_extension"))) log("  ext code deployed");
    if (!(await hasState(ext.accountId, "get_version"))) await must(ext, ext.accountId, "new", { admin: council.accountId, registry: registry.accountId, recovery: rec.accountId, treasury: council.accountId, council: council.accountId });
    if (await deploy(registry, HOS("tla_registry"))) log("  registry code deployed");
    if (!(await hasState(registry.accountId, "get_fee_config"))) {
      await must(registry, registry.accountId, "new", { admin: council.accountId, hos_extension: ext.accountId, grace_period_ns: String(14n * 86_400n * 1_000_000_000n), treasury: council.accountId, council: council.accountId, lease_term_ns: null });
    }
    const tla = await view(registry.accountId, "get_tla", { tla_id: crew.accountId }).catch(() => null);
    if (!tla) {
      await call(council, registry.accountId, "admin_set_initial_rate", { rate: "5000000" }, { deposit: ONE_YOCTO });
      await must(council, registry.accountId, "register_tla", { tla_id: crew.accountId, tla_type: "Open", premium_category: "Standard", licensee: null }, ONE_YOCTO);
      await must(council, registry.accountId, "activate_open_tla", { tla_id: crew.accountId }, ONE_YOCTO);
      const fee: any = await view(registry.accountId, "get_fee_config");
      fee.account_creation_deposit_yocto = milli(0.1).toString();
      await must(council, registry.accountId, "update_fee_config", { config: fee }, ONE_YOCTO);
      log("  crew namespace registered and active (creation deposit 0.1 NEAR per berth)");
    }
    const bound = await view<boolean>(registry.accountId, "is_payment_authority_bound", { account_id: trust.accountId, tla_id: crew.accountId }).catch(() => false);
    if (!bound) {
      await call(council, registry.accountId, "add_payment_authority", { account_id: trust.accountId }, { deposit: ONE_YOCTO });
      await must(council, registry.accountId, "bind_payment_authority_tla", { account_id: trust.accountId, tla_id: crew.accountId, max_mints: "1000" }, ONE_YOCTO);
      log("  welfare trust bound as the namespace's issuer");
    }
  }

  log("\n== tUSD, portage, allotment ==");
  if (await deploy(tusd, OURS("tusd"))) log("  tusd code deployed");
  if (!(await hasState(tusd.accountId, "ft_metadata"))) await must(tusd, tusd.accountId, "new", {});
  if (await deploy(portage, OURS("portage"))) log("  portage code deployed");
  if (!(await hasState(portage.accountId, "config"))) await must(portage, portage.accountId, "new", { registry: registryId, registrar: crewId }, 0n, "portage_new");
  if (await deploy(allotment, OURS("allotment"))) log("  allotment code deployed");
  if (!(await hasState(allotment.accountId, "stats"))) await must(allotment, allotment.accountId, "new", { registry: registryId }, 0n, "allotment_new");
  await call(root, tusd.accountId, "storage_deposit", { account_id: portage.accountId, registration_only: true }, { deposit: milli(0.00125) });

  log("\n== seal: delete the deployer keys (nobody can upgrade or drain these contracts) ==");
  if (process.env.SEAL !== "0") {
    for (const c of [portage, allotment, tusd]) {
      const keys: any[] = await accessKeys(c.accountId);
      for (const k of keys) {
        const r: any = await c.deleteKey(k.public_key);
        txs[`seal_${c.accountId.split(".")[0]}`] = r?.transaction?.hash ?? r?.transaction_outcome?.id ?? "";
        log(`  deleted ${k.public_key} on ${c.accountId}`);
      }
    }
  }

  const out = {
    network: "testnet",
    root: ROOT,
    hos_commit: "d85860a8cc2bfcb8b617b28cab558da5d39333fc",
    registry: registryId,
    registrar: crewId,
    council: id("council"),
    trust: id("trust"),
    wallet_impl: id("impl"),
    hos_extension: id("ext"),
    recovery: id("rec"),
    wallet_global_hash: DO_HOS && walletHash ? walletHash : undefined,
    hos_deployed: DO_HOS || undefined,
    tusd: tusd.accountId,
    portage: portage.accountId,
    allotment: allotment.accountId,
    code_hashes: {
      portage: { wasm_sha256_b58: sha256b58(OURS("portage")), wasm_sha256_hex: sha256hex(OURS("portage")), on_chain: await codeHash(portage.accountId) },
      allotment: { wasm_sha256_b58: sha256b58(OURS("allotment")), wasm_sha256_hex: sha256hex(OURS("allotment")), on_chain: await codeHash(allotment.accountId) },
      tusd: { wasm_sha256_b58: sha256b58(OURS("tusd")), on_chain: await codeHash(tusd.accountId) },
      ...(DO_HOS ? { tla_registry: { wasm_sha256_b58: sha256b58(HOS("tla_registry")), on_chain: await codeHash(registryId) } } : {}),
    },
    access_keys: {
      portage: (await accessKeys(portage.accountId)).length,
      allotment: (await accessKeys(allotment.accountId)).length,
    },
    txs,
    deployed_at: new Date().toISOString(),
  };
  mkdirSync("deployments", { recursive: true });
  const prev = existsSync("deployments/testnet.json") ? JSON.parse(readFileSync("deployments/testnet.json", "utf8")) : {};
  const merged: any = { ...prev, ...out, txs: { ...(prev.txs ?? {}), ...txs } };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  if (prev.wallet_global_hash && !DO_HOS) merged.wallet_global_hash = prev.wallet_global_hash;
  writeFileSync("deployments/testnet.json", JSON.stringify(merged, null, 2) + "\n");
  log("\n== deployments/testnet.json written ==");
  for (const [k, v] of Object.entries(txs)) log(`  ${k}: ${explorerTx(v)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
