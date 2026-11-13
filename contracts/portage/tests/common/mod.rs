//! Sandbox harness: stands up the real House of Stake fleet (wasm built unmodified from the pinned
//! commit by `fleet/build-hos.sh`), our three contracts, and issues berths through the registry the
//! way the crew welfare trust does on testnet: as a bound payment authority on an Open namespace.
#![allow(dead_code)]

use anyhow::{bail, Result};
use near_workspaces::network::Sandbox;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId, Contract, Worker};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub const YEAR_NS: u64 = 31_536_000_000_000_000;
pub const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
pub const TUSD: u128 = 1_000_000;
pub const SEA_HASH: &str = "5e0f4b1a5e0f4b1a5e0f4b1a5e0f4b1a5e0f4b1a5e0f4b1a5e0f4b1a5e0f4b1a";

pub fn hos_wasm(name: &str) -> Vec<u8> {
    let dir = std::env::var("HOS_WASM_DIR").unwrap_or_else(|_| "../../fleet/wasm".into());
    let path = format!("{dir}/{name}.wasm");
    std::fs::read(&path).unwrap_or_else(|e| panic!("read {path}: {e}. Run fleet/build-hos.sh first"))
}

pub fn our_wasm(name: &str) -> Vec<u8> {
    let path = format!("../../target/near/{name}/{name}.wasm");
    std::fs::read(&path).unwrap_or_else(|e| panic!("read {path}: {e}. Run cargo near build in contracts/{name}"))
}

pub struct World {
    pub worker: Worker<Sandbox>,
    pub root: Account,
    pub council: Account,
    pub trust: Account,
    pub registry: Contract,
    pub registrar: Contract,
    pub extension: Account,
    pub tusd: Contract,
    pub portage: Contract,
    pub allotment: Contract,
    pub owner: Account,
    pub arjun: Account,
    pub relief: Account,
    pub mother: Account,
}

async fn sub(root: &Account, name: &str, near: u128) -> Result<Account> {
    Ok(root.create_subaccount(name).initial_balance(NearToken::from_near(near)).transact().await?.into_result()?)
}

pub fn ok(outcome: ExecutionFinalResult, what: &str) -> Result<ExecutionFinalResult> {
    if outcome.is_failure() {
        bail!("{what} failed: {:#?}", outcome.failures());
    }
    Ok(outcome)
}

/// Every log line of every receipt in the outcome.
pub fn logs(outcome: &ExecutionFinalResult) -> Vec<String> {
    outcome.logs().into_iter().map(String::from).collect()
}

pub fn failure_text(outcome: &ExecutionFinalResult) -> String {
    format!("{:?}", outcome.failures())
}

pub async fn call(signer: &Account, to: &AccountId, method: &str, args: Value, deposit: NearToken) -> Result<ExecutionFinalResult> {
    Ok(signer.call(to, method).args_json(args).deposit(deposit).max_gas().transact().await?)
}

pub async fn deploy_world() -> Result<World> {
    let worker = near_workspaces::sandbox().await?;
    let root = worker.root_account()?;
    let council = sub(&root, "council", 30).await?;
    let patch = sub(&root, "patch", 5).await?;
    let registry_acc = sub(&root, "registry", 30).await?;
    let extension = sub(&root, "ext", 10).await?;
    let recovery = sub(&root, "rec", 10).await?;
    let impl_acc = sub(&root, "impl", 60).await?;
    let crew = sub(&root, "crew", 10).await?;
    let trust = sub(&root, "trust", 50).await?;

    // Wallet code published once as a global contract, as on mainnet.
    let deployer = impl_acc.deploy(&hos_wasm("wallet_impl_deployer")).await?.into_result()?;
    ok(deployer.call("new").args_json(json!({ "council": council.id(), "patch_authority": patch.id(), "approval_delay_ns": "0" })).transact().await?, "deployer new")?;
    let wallet = hos_wasm("hos_wallet");
    let hash = bs58::encode(Sha256::digest(&wallet)).into_string();
    ok(call(&council, deployer.id(), "gd_approve", json!({ "hash": hash }), ONE_YOCTO).await?, "gd_approve")?;
    let cost = NearToken::from_yoctonear(wallet.len() as u128 * 100_000_000_000_000_000_000);
    ok(impl_acc.call(deployer.id(), "gd_deploy").args_json(json!({ "code": near_sdk_b64(&wallet) })).deposit(cost).max_gas().transact().await?, "gd_deploy")?;

    // The crew namespace: a registrar on crew.<root>.
    let registrar = crew.deploy(&hos_wasm("registrar")).await?.into_result()?;
    ok(registrar.call("new").args_json(json!({ "config": {
        "registry": registry_acc.id(), "council": council.id(), "wallet_impl": impl_acc.id(),
        "hos_extension": extension.id(), "recovery": recovery.id(), "chain_id": "testnet",
        "min_balance": NearToken::from_millinear(100), "wallet_timeout_secs": 3600 }})).transact().await?, "registrar new")?;

    let ext = extension.deploy(&hos_wasm("hos_extension")).await?.into_result()?;
    ok(ext.call("new").args_json(json!({ "admin": council.id(), "registry": registry_acc.id(), "recovery": recovery.id(), "treasury": council.id(), "council": council.id() })).max_gas().transact().await?, "ext new")?;
    let rec = recovery.deploy(&hos_wasm("mpc_recovery")).await?.into_result()?;
    ok(rec.call("new").args_json(json!({ "owner": council.id(), "signer": council.id(), "transfer_authority": extension.id(),
        "watchers": ["ed25519:DcA2MzgpJbrUATQLLceocVckhhAqrkingax4oJ9kZ847", "ed25519:5Et6ULLeXYzxkxjDAbDSoX8ahqQaYAbFMDvJGq8YJ2dE"], "threshold": 2 })).max_gas().transact().await?, "rec new")?;
    let registry = registry_acc.deploy(&hos_wasm("tla_registry")).await?.into_result()?;
    ok(registry.call("new").args_json(json!({ "admin": council.id(), "hos_extension": extension.id(), "grace_period_ns": (14u64 * 86_400 * 1_000_000_000).to_string(),
        "treasury": council.id(), "council": council.id(), "lease_term_ns": null })).max_gas().transact().await?, "registry new")?;
    let tla = registrar.id();
    ok(call(&council, registry.id(), "admin_set_initial_rate", json!({ "rate": "5000000" }), ONE_YOCTO).await?, "rate")?;
    ok(call(&council, registry.id(), "register_tla", json!({ "tla_id": tla, "tla_type": "Open", "premium_category": "Standard", "licensee": null }), ONE_YOCTO).await?, "register_tla")?;
    ok(call(&council, registry.id(), "activate_open_tla", json!({ "tla_id": tla }), ONE_YOCTO).await?, "activate")?;
    let mut fee: Value = registry.view("get_fee_config").await?.json()?;
    fee["account_creation_deposit_yocto"] = json!(NearToken::from_millinear(200).as_yoctonear().to_string());
    ok(call(&council, registry.id(), "update_fee_config", json!({ "config": fee }), ONE_YOCTO).await?, "fee config")?;
    // The trust issues berths: a payment authority bound to the crew namespace.
    ok(call(&council, registry.id(), "add_payment_authority", json!({ "account_id": trust.id() }), ONE_YOCTO).await?, "add_payment_authority")?;
    ok(call(&council, registry.id(), "bind_payment_authority_tla", json!({ "account_id": trust.id(), "tla_id": tla, "max_mints": "1000" }), ONE_YOCTO).await?, "bind")?;

    // Ours.
    let tusd_acc = sub(&root, "tusd", 10).await?;
    let tusd = tusd_acc.deploy(&our_wasm("tusd")).await?.into_result()?;
    ok(tusd.call("new").transact().await?, "tusd new")?;
    let portage_acc = sub(&root, "portage", 10).await?;
    let portage = portage_acc.deploy(&our_wasm("portage")).await?.into_result()?;
    ok(portage.call("new").args_json(json!({ "registry": registry.id(), "registrar": registrar.id() })).transact().await?, "portage new")?;
    let allot_acc = sub(&root, "allotment", 10).await?;
    let allotment = allot_acc.deploy(&our_wasm("allotment")).await?.into_result()?;
    ok(allotment.call("new").args_json(json!({ "registry": registry.id() })).transact().await?, "allotment new")?;

    let owner = sub(&root, "kestrel", 20).await?;
    let arjun = sub(&root, "arjun", 20).await?;
    let relief = sub(&root, "relief", 20).await?;
    let mother = sub(&root, "mother", 5).await?;
    for who in [&owner, &arjun, &relief, &mother] {
        ok(call(who, tusd.id(), "storage_deposit", json!({}), NearToken::from_millinear(10)).await?, "register")?;
    }
    ok(call(&owner, tusd.id(), "storage_deposit", json!({ "account_id": portage.id() }), NearToken::from_millinear(10)).await?, "register portage")?;
    ok(owner.call(tusd.id(), "faucet").args_json(json!({})).transact().await?, "faucet")?;

    Ok(World { worker, root, council, trust, registry, registrar, extension, tusd, portage, allotment, owner, arjun, relief, mother })
}

fn near_sdk_b64(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

impl World {
    /// The trust issues `name` under the crew namespace to `crew`, paying out to `payout`.
    pub async fn issue_berth(&self, name: &str, crew: &AccountId, payout: &AccountId) -> Result<AccountId> {
        let now = self.worker.view_block().await?.timestamp();
        let out = self.trust.call(self.registry.id(), "rent_sub_account_paid")
            .args_json(json!({ "tla_id": self.registrar.id(), "name": name, "owner_account": crew, "payout_account": payout, "order_id": format!("berth-{name}-{now}") }))
            .deposit(NearToken::from_millinear(300)).max_gas().transact().await?;
        ok(out, "issue berth")?;
        let id: AccountId = format!("{name}.{}", self.registrar.id()).parse()?;
        for _ in 0..20 {
            if let Ok(r) = self.worker.view(&id, "nft_item_info").await {
                if r.json::<Value>().is_ok() { return Ok(id); }
            }
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
        bail!("{id} never answered nft_item_info")
    }

    pub async fn item(&self, berth: &AccountId) -> Result<Value> {
        Ok(self.worker.view(berth, "nft_item_info").await?.json()?)
    }

    pub async fn token_owner(&self, berth: &AccountId) -> Result<Option<String>> {
        let t: Option<Value> = self.registry.view("nft_token").args_json(json!({ "token_id": berth })).await?.json()?;
        Ok(t.map(|t| t["owner_id"].as_str().unwrap().to_string()))
    }

    pub async fn tusd_of(&self, who: &AccountId) -> Result<u128> {
        let v: String = self.tusd.view("ft_balance_of").args_json(json!({ "account_id": who })).await?.json()?;
        Ok(v.parse()?)
    }

    pub async fn near_of(&self, who: &AccountId) -> Result<u128> {
        Ok(self.worker.view_account(who).await?.balance.as_yoctonear())
    }

    pub async fn send_tusd(&self, from: &Account, to: &AccountId, amount: u128) -> Result<()> {
        ok(call(from, self.tusd.id(), "storage_deposit", json!({ "account_id": to, "registration_only": true }), NearToken::from_millinear(10)).await?, "register receiver")?;
        ok(call(from, self.tusd.id(), "ft_transfer", json!({ "receiver_id": to, "amount": amount.to_string() }), ONE_YOCTO).await?, "ft_transfer")?;
        Ok(())
    }

    pub async fn transfer_berth(&self, from: &Account, berth: &AccountId, to: &AccountId) -> Result<ExecutionFinalResult> {
        call(from, self.registry.id(), "nft_transfer", json!({ "receiver_id": to, "token_id": berth }), ONE_YOCTO).await
    }

    /// The holder acts on their berth through the only door it has.
    pub async fn wallet_exec(&self, holder: &Account, berth: &AccountId, request: Value) -> Result<ExecutionFinalResult> {
        Ok(holder.call(berth, "w_execute_extension").args_json(json!({ "request": request })).deposit(ONE_YOCTO).gas(Gas::from_tgas(150)).transact().await?)
    }

    pub async fn add_allotment_extension_and_grant(&self, holder: &Account, berth: &AccountId, receivers: Vec<&AccountId>, budget: u128) -> Result<()> {
        ok(self.wallet_exec(holder, berth, json!({ "internal": [{ "op": "add_extension", "payload": { "account_id": self.allotment.id() } }] })).await?, "add_extension")?;
        let expires = self.worker.view_block().await?.timestamp() + YEAR_NS / 2;
        ok(call(holder, berth, "hos_grant_spend", json!({
            "extension": self.allotment.id(), "receivers": receivers, "budget_yocto": "0",
            "tokens": [{ "token": self.tusd.id(), "budget": budget.to_string() }], "items": [], "expires_at": expires.to_string() }), ONE_YOCTO).await?, "hos_grant_spend")?;
        Ok(())
    }

    pub async fn create_ship(&self, spd: u64, grace_days: u64, allowance: u128) -> Result<u64> {
        let out = ok(call(&self.owner, self.portage.id(), "create_ship", json!({
            "name": "MV Kestrel (fictional)", "imo": "IMO 0000000 (fictional)", "token": self.tusd.id(),
            "secs_per_day": spd.to_string(), "reserve_months": 4, "grace_days": grace_days.to_string(),
            "repatriation_allowance": allowance.to_string() }), NearToken::from_millinear(50)).await?, "create_ship")?;
        let id: String = out.json()?;
        Ok(id.parse()?)
    }

    pub async fn open_berth(&self, ship: u64, berth: &AccountId, wage: u128, days: u64) -> Result<()> {
        ok(call(&self.owner, self.portage.id(), "open_berth", json!({ "ship_id": ship.to_string(), "berth": berth, "daily_wage": wage.to_string(), "contract_days": days.to_string(), "sea_hash": SEA_HASH }), NearToken::from_millinear(20)).await?, "open_berth")?;
        Ok(())
    }

    pub async fn fund(&self, ship: u64, amount: u128) -> Result<()> {
        ok(call(&self.owner, self.tusd.id(), "ft_transfer_call", json!({ "receiver_id": self.portage.id(), "amount": amount.to_string(), "msg": format!("{{\"fund\":\"{ship}\"}}") }), ONE_YOCTO).await?, "fund")?;
        Ok(())
    }

    pub async fn sign_on(&self, crew: &Account, berth: &AccountId, wage: u128) -> Result<(bool, Vec<String>)> {
        let out = call(crew, self.portage.id(), "sign_on", json!({ "berth": berth, "confirmed_daily_wage": wage.to_string(), "sea_hash": SEA_HASH }), NearToken::from_yoctonear(0)).await?;
        let l = logs(&out);
        let signed: bool = out.json().unwrap_or(false);
        Ok((signed, l))
    }

    pub async fn berth_view(&self, berth: &AccountId) -> Result<Value> {
        Ok(self.portage.view("get_berth").args_json(json!({ "berth": berth })).await?.json()?)
    }

    pub async fn ship_view(&self, ship: u64) -> Result<Value> {
        Ok(self.portage.view("get_ship").args_json(json!({ "ship_id": ship.to_string() })).await?.json()?)
    }

    pub async fn settle(&self, berth: &AccountId) -> Result<ExecutionFinalResult> {
        call(&self.root, self.portage.id(), "settle", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await
    }

    pub async fn wait_secs(&self, secs: u64) -> Result<()> {
        let start = self.worker.view_block().await?.timestamp();
        let target = start + secs * 1_000_000_000;
        loop {
            self.worker.fast_forward(20).await?;
            if self.worker.view_block().await?.timestamp() >= target { return Ok(()); }
        }
    }
}

pub fn u(v: &Value) -> u128 {
    v.as_str().map(|s| s.parse().unwrap()).unwrap_or_else(|| v.as_u64().unwrap() as u128)
}
