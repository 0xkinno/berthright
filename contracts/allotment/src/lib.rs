//! Allotment: sends a crew member's standing allotment home from their berth.
//!
//! The crew member adds this contract as an extension on their berth (a House of Stake leased
//! name) and grants it a spend fence with `hos_grant_spend`: which receivers, which token, how
//! much in total, until when. This contract then asks the berth to pay, on schedule, through
//! `w_execute_extension`. The berth's own audited wallet code enforces the fence; this contract
//! cannot pay anyone the crew member did not name, or more than they allowed. Every hand-over of
//! the berth wipes the grant, so an old holder's allotment stops by itself.

use near_sdk::base64::{engine::general_purpose::STANDARD as B64, Engine};
use near_sdk::json_types::{U128, U64};
use near_sdk::serde::Serialize;
use near_sdk::serde_json::{self, json};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault,
    Promise, PromiseError, PromiseOrValue,
};

pub const STANDARD: &str = "berthright";
pub const VERSION: &str = "1.0.0";
pub const MIN_EVERY_SECS: u64 = 10;
const NS: u64 = 1_000_000_000;
const GAS_VIEW: Gas = Gas::from_tgas(5);
const GAS_STORAGE_DEPOSIT: Gas = Gas::from_tgas(5);
const GAS_EXECUTE: Gas = Gas::from_tgas(60);
const GAS_FT_INSIDE: Gas = Gas::from_tgas(15);
const GAS_ON_CHECK: Gas = Gas::from_tgas(110);
const GAS_ON_RAN: Gas = Gas::from_tgas(10);
const GAS_ON_SET: Gas = Gas::from_tgas(15);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
const STORAGE_DEPOSIT: NearToken = NearToken::from_micronear(1_250);
/// The contract keeps a small NEAR float for the 1 yocto each wallet call needs and for token
/// registration of receivers. Below this it refuses to run, in plain words.
pub const FLOAT_FLOOR: NearToken = NearToken::from_millinear(50);
pub const SET_DEPOSIT: NearToken = NearToken::from_millinear(10);

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct NftItemInfo {
    pub spec: String,
    pub init: bool,
    pub status: String,
    pub collection_id: AccountId,
    pub token_id: String,
    pub owner_id: AccountId,
    pub rotation_seq: U64,
    pub rotation_epoch: u32,
}

#[ext_contract(ext_item)]
pub trait Item {
    fn nft_item_info(&self) -> NftItemInfo;
}

#[ext_contract(ext_wallet)]
pub trait Wallet {
    fn w_execute_extension(&mut self, request: serde_json::Value);
}

#[ext_contract(ext_ft)]
pub trait Ft {
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

// The request shape the House of Stake wallet reads (defuse-wallet `Request`).
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
struct WalletPromise {
    receiver_id: AccountId,
    actions: Vec<WalletAction>,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde", tag = "action", content = "payload", rename_all = "snake_case")]
enum WalletAction {
    FunctionCall {
        function_name: String,
        args: String,
        deposit: NearToken,
        gas: Gas,
    },
}

/// The exact `request` argument for one allotment payment.
pub fn ft_transfer_request(token: &AccountId, receiver: &AccountId, amount: u128) -> serde_json::Value {
    let args = json!({ "receiver_id": receiver, "amount": U128(amount), "memo": "allotment" }).to_string();
    let promise = WalletPromise {
        receiver_id: token.clone(),
        actions: vec![WalletAction::FunctionCall {
            function_name: "ft_transfer".into(),
            args: B64.encode(args.as_bytes()),
            deposit: ONE_YOCTO,
            gas: GAS_FT_INSIDE,
        }],
    };
    json!({ "external": [promise] })
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Allotment {
    pub berth: AccountId,
    pub owner: AccountId,
    pub rotation_seq: U64,
    pub token: AccountId,
    pub receiver: AccountId,
    pub amount: U128,
    pub every_secs: U64,
    pub next_due_ns: U64,
    pub sent_total: U128,
    pub runs: u32,
    pub stopped: Option<String>,
    pub running: bool,
}

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Allotments,
}

#[near(contract_state, contract_metadata(version = "1.0.0", link = "https://github.com/0xkinno/berthright", standard(standard = "nep297", version = "1.0.0"), standard(standard = "berthright", version = "1.0.0")))]
#[derive(PanicOnDefault)]
pub struct AllotmentContract {
    pub registry: AccountId,
    allotments: LookupMap<AccountId, Allotment>,
    pub total_sent: u128,
    pub total_runs: u64,
}

/// NEAR the contract can actually spend: its balance minus what storage locks.
fn liquid() -> u128 {
    env::account_balance()
        .as_yoctonear()
        .saturating_sub(env::storage_byte_cost().as_yoctonear() * env::storage_usage() as u128)
}

fn emit(event: &str, data: serde_json::Value) {
    let payload = json!({ "standard": STANDARD, "version": VERSION, "event": event, "data": [data] });
    env::log_str(&format!("EVENT_JSON:{payload}"));
}

fn refuse(code: &str, berth: &AccountId) {
    env::log_str(&format!("REFUSED:{}", json!({ "code": code, "berth": berth })));
}

#[near]
impl AllotmentContract {
    #[init]
    pub fn new(registry: AccountId) -> Self {
        Self { registry, allotments: LookupMap::new(Key::Allotments), total_sent: 0, total_runs: 0 }
    }

    /// Records a standing allotment. Only the berth's current holder may set it; the holder is
    /// read from the berth itself. The first payment is due straight away.
    #[payable]
    pub fn set_allotment(&mut self, berth: AccountId, token: AccountId, receiver: AccountId, amount: U128, every_secs: U64) -> Promise {
        require!(env::attached_deposit() >= SET_DEPOSIT, "E_STORAGE_DEPOSIT");
        require!(amount.0 > 0, "E_AMOUNT_ZERO");
        require!(every_secs.0 >= MIN_EVERY_SECS, "E_TOO_FREQUENT");
        require!(receiver != berth, "E_RECEIVER_IS_BERTH");
        ext_item::ext(berth.clone())
            .with_static_gas(GAS_VIEW)
            .nft_item_info()
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_ON_SET)
                    .on_set_checked(berth, env::predecessor_account_id(), token, receiver, amount, every_secs),
            )
    }

    #[private]
    pub fn on_set_checked(
        &mut self,
        berth: AccountId,
        caller: AccountId,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
        every_secs: U64,
        #[callback_result] item: Result<NftItemInfo, PromiseError>,
    ) -> bool {
        let Ok(item) = item else { refuse("E_BERTH_UNREADABLE", &berth); return false };
        if item.collection_id != self.registry || item.token_id != berth.as_str() {
            refuse("E_COLLECTION_MISMATCH", &berth);
            return false;
        }
        if item.owner_id != caller {
            refuse("E_NOT_BERTH_HOLDER", &berth);
            return false;
        }
        if item.status != "Active" {
            refuse("E_BERTH_NOT_ACTIVE", &berth);
            return false;
        }
        let a = Allotment {
            berth: berth.clone(),
            owner: caller,
            rotation_seq: item.rotation_seq,
            token,
            receiver,
            amount,
            every_secs,
            next_due_ns: U64(env::block_timestamp()),
            sent_total: U128(0),
            runs: 0,
            stopped: None,
            running: false,
        };
        emit("allotment_set", json!(a));
        self.allotments.insert(berth, a);
        true
    }

    /// The holder stops their allotment. (Revoking the grant on the berth also stops it.)
    pub fn stop(&mut self, berth: AccountId) {
        let a = self.allotments.get_mut(&berth).unwrap_or_else(|| env::panic_str("E_NO_ALLOTMENT"));
        require!(a.owner == env::predecessor_account_id(), "E_NOT_ALLOTMENT_OWNER");
        a.stopped = Some("E_STOPPED_BY_HOLDER".into());
        emit("allotment_stopped", json!({ "berth": berth, "reason": "E_STOPPED_BY_HOLDER" }));
    }

    /// Anyone may run a due allotment. Re-reads the berth first and stops for good if it
    /// changed hands since the allotment was set.
    pub fn run(&mut self, berth: AccountId) -> PromiseOrValue<String> {
        let a = self.allotments.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_ALLOTMENT"));
        if let Some(reason) = &a.stopped {
            env::panic_str(&format!("E_ALLOTMENT_STOPPED {reason}"));
        }
        require!(!a.running, "E_RUN_IN_FLIGHT");
        let now = env::block_timestamp();
        if now < a.next_due_ns.0 {
            env::panic_str(&format!("E_NOT_DUE {}", json!({ "seconds_left": (a.next_due_ns.0 - now).div_ceil(NS) })));
        }
        require!(liquid() >= FLOAT_FLOOR.as_yoctonear(), "E_FLOAT_TOO_LOW");
        let token = a.token.clone();
        let receiver = a.receiver.clone();
        self.allotments.get_mut(&berth).unwrap().running = true;
        PromiseOrValue::Promise(
            ext_item::ext(berth.clone())
                .with_static_gas(GAS_VIEW)
                .nft_item_info()
                .and(
                    ext_ft::ext(token)
                        .with_attached_deposit(STORAGE_DEPOSIT)
                        .with_static_gas(GAS_STORAGE_DEPOSIT)
                        .storage_deposit(Some(receiver), Some(true)),
                )
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_CHECK).on_run_checked(berth)),
        )
    }

    #[private]
    pub fn on_run_checked(&mut self, berth: AccountId, #[callback_result] item: Result<NftItemInfo, PromiseError>) -> PromiseOrValue<String> {
        let a = self.allotments.get_mut(&berth).unwrap();
        let Ok(item) = item else {
            a.running = false;
            refuse("E_BERTH_UNREADABLE", &berth);
            return PromiseOrValue::Value("E_BERTH_UNREADABLE".into());
        };
        if item.rotation_seq != a.rotation_seq || item.owner_id != a.owner {
            a.running = false;
            a.stopped = Some("E_BERTH_CHANGED_HANDS".into());
            emit("allotment_stopped", json!({ "berth": berth, "reason": "E_BERTH_CHANGED_HANDS", "new_owner": item.owner_id }));
            return PromiseOrValue::Value("E_BERTH_CHANGED_HANDS".into());
        }
        let request = ft_transfer_request(&a.token, &a.receiver, a.amount.0);
        let amount = a.amount;
        PromiseOrValue::Promise(
            ext_wallet::ext(berth.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_EXECUTE)
                .w_execute_extension(request)
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_RAN).on_ran(berth, amount)),
        )
    }

    /// The wallet call either passed the berth's fence or was refused by it. A refusal (no grant,
    /// wrong receiver, over budget, grant expired, berth frozen) stops the allotment; the reason
    /// is in the wallet's receipt and the app decodes it.
    #[private]
    pub fn on_ran(&mut self, berth: AccountId, amount: U128) -> String {
        let a = self.allotments.get_mut(&berth).unwrap();
        a.running = false;
        if !near_sdk::is_promise_success() {
            a.stopped = Some("E_WALLET_REFUSED".into());
            emit("allotment_stopped", json!({ "berth": berth, "reason": "E_WALLET_REFUSED" }));
            return "E_WALLET_REFUSED".into();
        }
        let now = env::block_timestamp();
        a.sent_total = U128(a.sent_total.0 + amount.0);
        a.runs += 1;
        let every = a.every_secs.0 * NS;
        let mut next = a.next_due_ns.0 + every;
        if next <= now {
            next = now + every;
        }
        a.next_due_ns = U64(next);
        let (receiver, token, sent) = (a.receiver.clone(), a.token.clone(), a.sent_total);
        self.total_sent += amount.0;
        self.total_runs += 1;
        emit("allotment_sent", json!({ "berth": berth, "receiver": receiver, "token": token, "amount": amount, "sent_total": sent, "next_due_ns": U64(next) }));
        "sent".into()
    }

    pub fn get_allotment(&self, berth: AccountId) -> Option<Allotment> {
        self.allotments.get(&berth).cloned()
    }

    pub fn stats(&self) -> serde_json::Value {
        json!({ "total_sent": U128(self.total_sent), "total_runs": U64(self.total_runs), "registry": self.registry,
                "float_yocto": U128(liquid()), "float_floor_yocto": U128(FLOAT_FLOOR.as_yoctonear()) })
    }

    /// The request this contract would send for `berth` right now, for anyone to inspect.
    pub fn preview_request(&self, berth: AccountId) -> serde_json::Value {
        let a = self.allotments.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_ALLOTMENT"));
        ft_transfer_request(&a.token, &a.receiver, a.amount.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_matches_the_wallet_shape() {
        let token: AccountId = "tusd.test.near".parse().unwrap();
        let mother: AccountId = "mother.test.near".parse().unwrap();
        let r = ft_transfer_request(&token, &mother, 200_000_000);
        let p = &r["external"][0];
        assert_eq!(p["receiver_id"], "tusd.test.near");
        assert_eq!(p["actions"][0]["action"], "function_call");
        let payload = &p["actions"][0]["payload"];
        assert_eq!(payload["function_name"], "ft_transfer");
        assert_eq!(payload["deposit"], "1");
        let args = B64.decode(payload["args"].as_str().unwrap()).unwrap();
        let args: serde_json::Value = serde_json::from_slice(&args).unwrap();
        assert_eq!(args, json!({ "receiver_id": "mother.test.near", "amount": "200000000", "memo": "allotment" }));
        println!("{r}");
    }
}
