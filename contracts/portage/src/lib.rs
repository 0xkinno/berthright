//! Portage: the Berthright wage chest.
//!
//! A shipowner opens a ship and funds it. Each berth on the ship is a House of Stake leased name
//! (an account that is also an NFT). Before anyone signs on to a berth, the chest must hold that
//! berth's reserve: four months of wages plus the fare home. Wages then accrue by the second and
//! anyone may settle them into the berth. If the shipowner stops funding, anyone may declare the
//! ship abandoned after the grace period, and anyone may release each crew member's reserve to the
//! account that signed on.

pub mod events;
pub mod ledger;

#[cfg(test)]
mod tests;

use ledger::{Accrual, BerthStatus, Books, ShipStatus};
use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{self, json};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault,
    Promise, PromiseError, PromiseOrValue,
};

pub const MAX_BERTHS: usize = 40;
pub const NS: u64 = 1_000_000_000;
pub const HISTORY_LEN: usize = 64;
pub const MIN_RESERVE_MONTHS: u8 = 4;
pub const MAX_GRACE_DAYS: u64 = 30;
/// Real day for launch ships; shorter "ship days" are only for labelled fast-clock demo ships.
pub const ALLOWED_SECS_PER_DAY: [u64; 4] = [86_400, 3_600, 60, 10];
pub const SHARDED_ITEM_SPEC: &str = "sharded-item-1.0.0";

const GAS_VIEW: Gas = Gas::from_tgas(5);
const GAS_STORAGE_DEPOSIT: Gas = Gas::from_tgas(5);
const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
const GAS_ON_PAID: Gas = Gas::from_tgas(10);
const GAS_ON_SIGN_ON: Gas = Gas::from_tgas(25);
const GAS_ON_SETTLE: Gas = Gas::from_tgas(50);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
/// NEP-145 registration for an account id up to 64 bytes. Refunded by a standard token when the
/// account is already registered.
const STORAGE_DEPOSIT: NearToken = NearToken::from_micronear(1_250);
pub const SHIP_DEPOSIT: NearToken = NearToken::from_millinear(50);
pub const BERTH_DEPOSIT: NearToken = NearToken::from_millinear(20);

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

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct NftToken {
    pub token_id: String,
    pub owner_id: AccountId,
}

#[ext_contract(ext_item)]
pub trait Item {
    fn nft_item_info(&self) -> NftItemInfo;
}

#[ext_contract(ext_collection)]
pub trait Collection {
    fn nft_token(&self, token_id: String) -> Option<NftToken>;
}

#[ext_contract(ext_ft)]
pub trait Ft {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

#[near(serializers = [borsh])]
pub struct Ship {
    pub owner: AccountId,
    pub name: String,
    pub imo: String,
    pub token: AccountId,
    pub secs_per_day: u64,
    pub reserve_months: u8,
    pub grace_secs: u64,
    pub repatriation_allowance: u128,
    pub books: Books,
    pub status: ShipStatus,
    pub abandoned_at: Option<u64>,
    pub berths: Vec<AccountId>,
    pub created_at: u64,
}

#[near(serializers = [borsh])]
pub struct Berth {
    pub ship_id: u64,
    pub daily_wage: u128,
    pub contract_secs: u64,
    pub sea_hash: String,
    pub holder: Option<AccountId>,
    pub rotation_seq: u64,
    pub accrual: Accrual,
    pub status: BerthStatus,
    /// Lifetime totals for the portage bill.
    pub paid_to_berth: u128,
    pub paid_to_holder: u128,
    pub uncovered: u128,
}

/// One line of the berth's sea-service record.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct HistoryEntry {
    pub kind: String,
    pub holder: AccountId,
    pub ship_id: U64,
    pub at_ns: U64,
    pub from_ns: U64,
    pub earned: U128,
    pub paid: U128,
    pub note: String,
}

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Ships,
    Berths,
    History,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Portage {
    pub registry: AccountId,
    pub registrar: AccountId,
    ships: LookupMap<u64, Ship>,
    berths: LookupMap<AccountId, Berth>,
    history: LookupMap<AccountId, Vec<HistoryEntry>>,
    next_ship_id: u64,
}

// ---------- views ----------

#[near(serializers = [json])]
pub struct ShipView {
    pub ship_id: U64,
    pub owner: AccountId,
    pub name: String,
    pub imo: String,
    pub token: AccountId,
    pub secs_per_day: U64,
    pub reserve_months: u8,
    pub grace_secs: U64,
    pub repatriation_allowance: U128,
    pub unreserved: U128,
    pub reserved: U128,
    pub payable: U128,
    pub arrears: U128,
    pub arrears_since_ns: Option<U64>,
    pub status: ShipStatus,
    pub abandoned_at_ns: Option<U64>,
    pub berths: Vec<AccountId>,
    pub funded_total: U128,
    pub paid_total: U128,
    pub withdrawn_total: U128,
    pub created_at_ns: U64,
}

#[near(serializers = [json])]
pub struct BerthView {
    pub berth: AccountId,
    pub ship_id: U64,
    pub daily_wage: U128,
    pub contract_secs: U64,
    pub sea_hash: String,
    pub holder: Option<AccountId>,
    pub rotation_seq: U64,
    pub status: BerthStatus,
    pub signed_on_at_ns: U64,
    pub settled_through_ns: U64,
    pub contract_end_ns: U64,
    pub carry: U128,
    pub reserve: U128,
    pub reserve_needed: U128,
    pub payable: U128,
    pub arrears: U128,
    pub earned: U128,
    pub due_now: U128,
    pub paid_to_berth: U128,
    pub paid_to_holder: U128,
    pub uncovered: U128,
}

#[near(serializers = [json])]
pub struct Coverage {
    pub ship_id: U64,
    /// Months of wages for every signed berth that the chest holds, in hundredths.
    pub months_on_board_x100: U64,
    pub reserved: U128,
    pub unreserved: U128,
    pub monthly_wage_bill: U128,
    pub arrears: U128,
    pub arrears_age_secs: Option<U64>,
    pub grace_left_secs: Option<U64>,
    pub status: ShipStatus,
}

#[near(serializers = [json])]
pub struct BillLine {
    pub berth: AccountId,
    pub holder: Option<AccountId>,
    pub status: BerthStatus,
    pub days_x100: U64,
    pub daily_wage: U128,
    pub earned: U128,
    pub paid_to_berth: U128,
    pub paid_to_holder: U128,
    pub payable: U128,
    pub arrears: U128,
    pub reserve: U128,
}

#[near(serializers = [json])]
pub struct SettleQuote {
    pub due_now: U128,
    pub payable: U128,
    pub arrears: U128,
    pub secs_to_next_unit: U64,
}

#[near]
impl Portage {
    #[init]
    pub fn new(registry: AccountId, registrar: AccountId) -> Self {
        Self {
            registry,
            registrar,
            ships: LookupMap::new(Key::Ships),
            berths: LookupMap::new(Key::Berths),
            history: LookupMap::new(Key::History),
            next_ship_id: 0,
        }
    }

    // ---------- shipowner ----------

    /// Opens a ship. `grace_days` and contract terms are in ship days of `secs_per_day` seconds.
    #[payable]
    pub fn create_ship(
        &mut self,
        name: String,
        imo: String,
        token: AccountId,
        secs_per_day: U64,
        reserve_months: u8,
        grace_days: U64,
        repatriation_allowance: U128,
    ) -> U64 {
        require!(env::attached_deposit() >= SHIP_DEPOSIT, "E_STORAGE_DEPOSIT");
        require!(reserve_months >= MIN_RESERVE_MONTHS, "E_RESERVE_BELOW_MLC");
        require!(
            grace_days.0 >= 1 && grace_days.0 <= MAX_GRACE_DAYS,
            "E_GRACE_TOO_LONG"
        );
        require!(
            ALLOWED_SECS_PER_DAY.contains(&secs_per_day.0),
            "E_SHIP_DAY_NOT_ALLOWED"
        );
        require!(!name.is_empty() && name.len() <= 64, "E_NAME");
        require!(imo.len() <= 32, "E_IMO");
        let id = self.next_ship_id;
        self.next_ship_id += 1;
        let owner = env::predecessor_account_id();
        let ship = Ship {
            owner: owner.clone(),
            name: name.clone(),
            imo: imo.clone(),
            token: token.clone(),
            secs_per_day: secs_per_day.0,
            reserve_months,
            grace_secs: grace_days.0 * secs_per_day.0,
            repatriation_allowance: repatriation_allowance.0,
            books: Books::new(),
            status: ShipStatus::Active,
            abandoned_at: None,
            berths: Vec::new(),
            created_at: env::block_timestamp(),
        };
        self.ships.insert(id, ship);
        events::emit(
            "ship_created",
            json!({
                "ship_id": U64(id), "owner": owner, "name": name, "imo": imo, "token": token,
                "secs_per_day": secs_per_day, "reserve_months": reserve_months,
                "grace_secs": U64(grace_days.0 * secs_per_day.0),
                "repatriation_allowance": repatriation_allowance,
            }),
        );
        U64(id)
    }

    /// Opens a berth on a ship. The berth must be a name issued under the crew namespace.
    #[payable]
    pub fn open_berth(
        &mut self,
        ship_id: U64,
        berth: AccountId,
        daily_wage: U128,
        contract_days: U64,
        sea_hash: String,
    ) {
        require!(env::attached_deposit() >= BERTH_DEPOSIT, "E_STORAGE_DEPOSIT");
        let suffix = format!(".{}", self.registrar);
        let label = berth.as_str().strip_suffix(suffix.as_str());
        require!(
            label.is_some_and(|l| !l.is_empty() && !l.contains('.')),
            "E_NOT_A_CREW_NAME"
        );
        require!(!self.berths.contains_key(&berth), "E_BERTH_EXISTS");
        require!(daily_wage.0 > 0, "E_WAGE_ZERO");
        require!(contract_days.0 >= 1 && contract_days.0 <= 366, "E_CONTRACT_DAYS");
        require!(is_hex32(&sea_hash), "E_SEA_HASH");
        let ship = self.ship_mut(ship_id.0);
        require!(ship.owner == env::predecessor_account_id(), "E_NOT_SHIP_OWNER");
        require!(ship.status == ShipStatus::Active, "E_SHIP_NOT_ACTIVE");
        require!(ship.berths.len() < MAX_BERTHS, "E_TOO_MANY_BERTHS");
        let spd = ship.secs_per_day;
        ship.berths.push(berth.clone());
        let contract_secs = contract_days.0 * spd;
        let reserve = ledger::reserve_for(daily_wage.0, ship.reserve_months, ship.repatriation_allowance);
        self.berths.insert(
            berth.clone(),
            Berth {
                ship_id: ship_id.0,
                daily_wage: daily_wage.0,
                contract_secs,
                sea_hash: sea_hash.to_lowercase(),
                holder: None,
                rotation_seq: 0,
                accrual: Accrual {
                    daily_wage: daily_wage.0,
                    ns_per_day: spd * NS,
                    signed_on_at: 0,
                    contract_ns: contract_secs * NS,
                    settled_through: 0,
                    carry: 0,
                    reserve: 0,
                    payable: 0,
                    arrears: 0,
                    earned: 0,
                },
                status: BerthStatus::Open,
                paid_to_berth: 0,
                paid_to_holder: 0,
                uncovered: 0,
            },
        );
        events::emit(
            "berth_opened",
            json!({
                "ship_id": ship_id, "berth": berth, "daily_wage": daily_wage,
                "contract_secs": U64(contract_secs), "sea_hash": sea_hash.to_lowercase(),
                "reserve_needed": U128(reserve),
            }),
        );
    }

    /// Takes back money the ship does not owe anyone. Never the reserve, never while wages are
    /// unpaid, never after abandonment.
    pub fn withdraw_surplus(&mut self, ship_id: U64, amount: U128) -> Promise {
        let now = env::block_timestamp();
        {
            let ship = self.ships.get(&ship_id.0).unwrap_or_else(|| env::panic_str("E_NO_SHIP"));
            require!(ship.owner == env::predecessor_account_id(), "E_NOT_SHIP_OWNER");
            require!(ship.status != ShipStatus::Abandoned, "E_SHIP_ABANDONED");
            require!(amount.0 > 0, "E_AMOUNT_ZERO");
        }
        self.accrue_ship(ship_id.0, now);
        let ship = self.ship_mut(ship_id.0);
        require!(
            ship.books.arrears == 0 && amount.0 <= ship.books.unreserved,
            "E_RESERVE_LOCKED"
        );
        ship.books.unreserved -= amount.0;
        ship.books.withdrawn_total += amount.0;
        let (owner, token) = (ship.owner.clone(), ship.token.clone());
        events::emit(
            "surplus_withdrawn",
            json!({ "ship_id": ship_id, "amount": amount, "to": owner }),
        );
        pay_out(&token, &owner, amount.0, "berthright surplus").then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_ON_PAID)
                .on_withdrawn(ship_id, amount),
        )
    }

    pub fn close_ship(&mut self, ship_id: U64) {
        let ship = self.ships.get(&ship_id.0).unwrap_or_else(|| env::panic_str("E_NO_SHIP"));
        require!(ship.owner == env::predecessor_account_id(), "E_NOT_SHIP_OWNER");
        for b in &ship.berths {
            let berth = self.berths.get(b).unwrap();
            require!(
                !matches!(berth.status, BerthStatus::Signed | BerthStatus::Interrupted)
                    || (berth.status == BerthStatus::Interrupted && berth.accrual.payable == 0),
                "E_CREW_ON_BOARD"
            );
        }
        let ship = self.ship_mut(ship_id.0);
        ship.status = ShipStatus::Closed;
        events::emit("ship_closed", json!({ "ship_id": ship_id }));
    }

    // ---------- crew ----------

    /// The gate. Reads the berth's own `nft_item_info` and the collection's `nft_token` together
    /// and refuses unless both name the caller, the berth is active, the wage and contract hash
    /// match the crew member's own contract, and the berth's reserve is on board.
    pub fn sign_on(&mut self, berth: AccountId, confirmed_daily_wage: U128, sea_hash: String) -> Promise {
        let b = self.berths.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_BERTH"));
        require!(
            matches!(b.status, BerthStatus::Open | BerthStatus::Interrupted | BerthStatus::SignedOff),
            "E_BERTH_TAKEN"
        );
        let crew = env::predecessor_account_id();
        ext_item::ext(berth.clone())
            .with_static_gas(GAS_VIEW)
            .nft_item_info()
            .and(
                ext_collection::ext(self.registry.clone())
                    .with_static_gas(GAS_VIEW)
                    .nft_token(berth.to_string()),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_ON_SIGN_ON)
                    .on_sign_on(berth, crew, confirmed_daily_wage, sea_hash),
            )
    }

    #[private]
    pub fn on_sign_on(
        &mut self,
        berth: AccountId,
        crew: AccountId,
        confirmed_daily_wage: U128,
        sea_hash: String,
        #[callback_result] item: Result<NftItemInfo, PromiseError>,
        #[callback_result] token: Result<Option<NftToken>, PromiseError>,
    ) -> bool {
        let refuse = |code: &str| {
            events::refuse(code, json!({ "berth": berth, "crew": crew }));
            false
        };
        let Ok(item) = item else { return refuse("E_BERTH_UNREADABLE") };
        let Ok(Some(token)) = token else { return refuse("E_NOT_IN_COLLECTION") };
        if item.spec != SHARDED_ITEM_SPEC || item.collection_id != self.registry || item.token_id != berth.as_str() || token.token_id != berth.as_str() {
            return refuse("E_COLLECTION_MISMATCH");
        }
        if item.owner_id != crew || token.owner_id != crew {
            return refuse("E_NOT_BERTH_HOLDER");
        }
        if item.status != "Active" {
            return refuse("E_BERTH_NOT_ACTIVE");
        }
        let Some(mut b) = self.berths.remove(&berth) else { return refuse("E_NO_BERTH") };
        let restore = |this: &mut Self, b: Berth, code: &str| {
            this.berths.insert(berth.clone(), b);
            events::refuse(code, json!({ "berth": berth, "crew": crew }));
            false
        };
        if !matches!(b.status, BerthStatus::Open | BerthStatus::Interrupted | BerthStatus::SignedOff) {
            return restore(self, b, "E_BERTH_TAKEN");
        }
        if confirmed_daily_wage.0 != b.daily_wage || sea_hash.to_lowercase() != b.sea_hash {
            return restore(self, b, "E_WAGE_DIFFERS_FROM_YOUR_CONTRACT");
        }
        let now = env::block_timestamp();
        let ship = self.ships.get_mut(&b.ship_id).unwrap();
        if ship.status != ShipStatus::Active {
            return restore(self, b, "E_SHIP_NOT_ACTIVE");
        }
        let reserve = ledger::reserve_for(b.daily_wage, ship.reserve_months, ship.repatriation_allowance);
        if ship.books.arrears > 0 || !ledger::lock_reserve(&mut ship.books, &mut b.accrual, reserve) {
            return restore(self, b, "E_RESERVE_NOT_ON_BOARD");
        }
        b.holder = Some(crew.clone());
        b.rotation_seq = item.rotation_seq.0;
        b.status = BerthStatus::Signed;
        b.accrual.signed_on_at = now;
        b.accrual.settled_through = now;
        b.accrual.carry = 0;
        b.accrual.earned = 0;
        let ship_id = b.ship_id;
        let contract_end = b.accrual.contract_end();
        self.berths.insert(berth.clone(), b);
        self.push_history(&berth, "signed_on", &crew, ship_id, now, now, 0, 0, "");
        events::emit(
            "signed_on",
            json!({
                "ship_id": U64(ship_id), "berth": berth, "holder": crew,
                "rotation_seq": item.rotation_seq, "reserve": U128(reserve),
                "signed_on_at": U64(now), "contract_end": U64(contract_end),
            }),
        );
        true
    }

    /// The crew member leaves the berth: final wages go to their own account, the reserve
    /// returns to the ship, and the stint is written into the berth's record.
    pub fn sign_off(&mut self, berth: AccountId) -> PromiseOrValue<bool> {
        let now = env::block_timestamp();
        let caller = env::predecessor_account_id();
        {
            let b = self.berths.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_BERTH"));
            require!(b.holder.as_ref() == Some(&caller) && b.status == BerthStatus::Signed, "E_NOT_BERTH_HOLDER");
            let ship = self.ships.get(&b.ship_id).unwrap();
            require!(ship.status != ShipStatus::Abandoned, "E_SHIP_ABANDONED");
        }
        let mut b = self.berths.remove(&berth).unwrap();
        let ship = self.ships.get_mut(&b.ship_id).unwrap();
        ledger::accrue(&mut ship.books, &mut b.accrual, now);
        ledger::unlock_reserve(&mut ship.books, &mut b.accrual);
        b.status = BerthStatus::SignedOff;
        let ship_id = b.ship_id;
        let token = ship.token.clone();
        let earned = b.accrual.earned;
        let from = b.accrual.signed_on_at;
        let amount = ledger::take_payable(&mut ship.books, &mut b.accrual);
        b.paid_to_holder += amount;
        let arrears_left = b.accrual.arrears;
        self.berths.insert(berth.clone(), b);
        self.cover_ship_arrears(ship_id);
        self.push_history(&berth, "signed_off", &caller, ship_id, now, from, earned, amount, "");
        events::emit(
            "signed_off",
            json!({ "ship_id": U64(ship_id), "berth": berth, "holder": caller, "paid": U128(amount),
                    "earned": U128(earned), "arrears_left": U128(arrears_left), "at": U64(now) }),
        );
        if amount == 0 {
            return PromiseOrValue::Value(true);
        }
        PromiseOrValue::Promise(self.pay_berth_money(&token, &caller, &berth, ship_id, amount, true, "berthright final wages"))
    }

    // ---------- anyone ----------

    /// Settles a berth. Re-reads the berth's `nft_item_info` every time and never pays a berth
    /// whose holder or rotation changed without a sign-off: those wages go to the account that
    /// signed on.
    pub fn settle(&mut self, berth: AccountId) -> PromiseOrValue<String> {
        let b = self.berths.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_BERTH"));
        let now = env::block_timestamp();
        let ship = self.ships.get(&b.ship_id).unwrap();
        if b.status == BerthStatus::Signed {
            let cutoff = ship.abandoned_at.unwrap_or(now);
            let (units, _, _) = b.accrual.preview(cutoff);
            let coverable = units + b.accrual.arrears;
            if b.accrual.payable == 0 && (coverable == 0 || ship.books.unreserved == 0) {
                if units > 0 || b.accrual.arrears > 0 {
                    // Book the unpaid wages so the arrears clock starts.
                    self.accrue_berth(&berth, now);
                    return PromiseOrValue::Value("E_ARREARS_RECORDED".into());
                }
                return PromiseOrValue::Value("E_NOTHING_DUE".into());
            }
            return PromiseOrValue::Promise(
                ext_item::ext(berth.clone())
                    .with_static_gas(GAS_VIEW)
                    .nft_item_info()
                    .then(
                        Self::ext(env::current_account_id())
                            .with_static_gas(GAS_ON_SETTLE)
                            .on_settle_checked(berth),
                    ),
            );
        }
        if b.accrual.payable > 0 {
            if let Some(holder) = b.holder.clone() {
                let token = ship.token.clone();
                let ship_id = b.ship_id;
                let mut b = self.berths.remove(&berth).unwrap();
                let ship = self.ships.get_mut(&ship_id).unwrap();
                let amount = ledger::take_payable(&mut ship.books, &mut b.accrual);
                b.paid_to_holder += amount;
                self.berths.insert(berth.clone(), b);
                events::emit("settled_to_holder", json!({ "ship_id": U64(ship_id), "berth": berth, "holder": holder, "amount": U128(amount), "reason": "retry" }));
                return PromiseOrValue::Promise(self.pay_berth_money(&token, &holder, &berth, ship_id, amount, true, "berthright wages"));
            }
        }
        PromiseOrValue::Value("E_NOTHING_DUE".into())
    }

    #[private]
    pub fn on_settle_checked(
        &mut self,
        berth: AccountId,
        #[callback_result] item: Result<NftItemInfo, PromiseError>,
    ) -> PromiseOrValue<String> {
        let now = env::block_timestamp();
        match self.berths.get(&berth) {
            Some(b) if b.holder.is_some() => {}
            _ => return PromiseOrValue::Value("E_NOTHING_DUE".into()),
        }
        let mut b = self.berths.remove(&berth).unwrap();
        let ship = self.ships.get_mut(&b.ship_id).unwrap();
        let ship_id = b.ship_id;
        let token = ship.token.clone();
        if b.status == BerthStatus::Signed {
            let cutoff = ship.abandoned_at.unwrap_or(now);
            ledger::accrue(&mut ship.books, &mut b.accrual, cutoff);
        }
        let holder = b.holder.clone().unwrap();
        let Ok(item) = item else {
            self.berths.insert(berth.clone(), b);
            events::refuse("E_BERTH_UNREADABLE", json!({ "berth": berth }));
            return PromiseOrValue::Value("E_BERTH_UNREADABLE".into());
        };
        let same_holder = item.owner_id == holder
            && item.rotation_seq.0 == b.rotation_seq
            && item.collection_id == self.registry;
        if b.status == BerthStatus::Signed && !same_holder {
            // Unannounced hand-over: the berth now belongs to someone who never signed on.
            ledger::unlock_reserve(&mut ship.books, &mut b.accrual);
            b.status = BerthStatus::Interrupted;
            let amount = ledger::take_payable(&mut ship.books, &mut b.accrual);
            b.paid_to_holder += amount;
            let (earned, from) = (b.accrual.earned, b.accrual.signed_on_at);
            self.berths.insert(berth.clone(), b);
            self.cover_ship_arrears(ship_id);
            self.push_history(&berth, "interrupted", &holder, ship_id, now, from, earned, amount, "hand-over without sign-off");
            events::emit(
                "settled_to_holder",
                json!({ "ship_id": U64(ship_id), "berth": berth, "holder": holder, "amount": U128(amount),
                        "reason": "rotation_changed", "new_owner": item.owner_id, "rotation_seq": item.rotation_seq }),
            );
            if amount == 0 {
                return PromiseOrValue::Value("interrupted".into());
            }
            return PromiseOrValue::Promise(self.pay_berth_money(&token, &holder, &berth, ship_id, amount, true, "berthright wages"));
        }
        let to_berth = matches!(item.status.as_str(), "Active" | "Frozen") && b.status == BerthStatus::Signed;
        let amount = ledger::take_payable(&mut ship.books, &mut b.accrual);
        if amount == 0 {
            self.berths.insert(berth.clone(), b);
            return PromiseOrValue::Value("E_NOTHING_DUE".into());
        }
        let to = if to_berth { berth.clone() } else { holder.clone() };
        if to_berth {
            b.paid_to_berth += amount;
        } else {
            b.paid_to_holder += amount;
        }
        let arrears = b.accrual.arrears;
        self.berths.insert(berth.clone(), b);
        if to_berth {
            events::emit("settled", json!({ "ship_id": U64(ship_id), "berth": berth, "to": to, "amount": U128(amount), "arrears": U128(arrears), "at": U64(now) }));
        } else {
            events::emit("settled_to_holder", json!({ "ship_id": U64(ship_id), "berth": berth, "holder": holder, "amount": U128(amount), "reason": item.status }));
        }
        PromiseOrValue::Promise(self.pay_berth_money(&token, &to, &berth, ship_id, amount, !to_berth, "berthright wages"))
    }

    /// After the grace period with wages still unpaid, anyone may declare the ship abandoned.
    pub fn declare_abandonment(&mut self, ship_id: U64) {
        let now = env::block_timestamp();
        self.accrue_ship(ship_id.0, now);
        let ship = self.ship_mut(ship_id.0);
        require!(ship.status == ShipStatus::Active, "E_SHIP_NOT_ACTIVE");
        let Some(since) = ship.books.arrears_since.filter(|_| ship.books.arrears > 0) else {
            env::panic_str(&format!("E_NOT_YET_ABANDONED {}", json!({ "seconds_left": null, "reason": "no unpaid wages" })));
        };
        let due = since.saturating_add(ship.grace_secs * NS);
        if now < due {
            let left = (due - now).div_ceil(NS);
            env::panic_str(&format!("E_NOT_YET_ABANDONED {}", json!({ "seconds_left": left })));
        }
        ship.status = ShipStatus::Abandoned;
        ship.abandoned_at = Some(now);
        let arrears = ship.books.arrears;
        events::emit(
            "abandonment_declared",
            json!({ "ship_id": ship_id, "at": U64(now), "arrears": U128(arrears), "arrears_since": U64(since), "by": env::predecessor_account_id() }),
        );
    }

    /// Pays one crew member everything the guarantee owes them, to the account that signed on.
    pub fn release_guarantee(&mut self, berth: AccountId) -> Promise {
        {
            let b = self.berths.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_BERTH"));
            let ship = self.ships.get(&b.ship_id).unwrap();
            require!(ship.status == ShipStatus::Abandoned, "E_NOT_ABANDONED");
            require!(b.status != BerthStatus::Released, "E_ALREADY_RELEASED");
            require!(b.status == BerthStatus::Signed, "E_NOT_SIGNED_ON");
        }
        let mut b = self.berths.remove(&berth).unwrap();
        let ship = self.ships.get_mut(&b.ship_id).unwrap();
        let at = ship.abandoned_at.unwrap();
        ledger::accrue(&mut ship.books, &mut b.accrual, at);
        let r = ledger::release(&mut ship.books, &mut b.accrual, at, ship.repatriation_allowance);
        b.status = BerthStatus::Released;
        b.paid_to_holder += r.pay;
        b.uncovered += r.uncovered;
        let holder = b.holder.clone().unwrap();
        let ship_id = b.ship_id;
        let token = ship.token.clone();
        let (earned, from) = (b.accrual.earned, b.accrual.signed_on_at);
        self.berths.insert(berth.clone(), b);
        self.cover_ship_arrears(ship_id);
        self.push_history(&berth, "released", &holder, ship_id, env::block_timestamp(), from, earned, r.pay, "abandonment guarantee");
        events::emit(
            "guarantee_released",
            json!({ "ship_id": U64(ship_id), "berth": berth, "holder": holder, "amount": U128(r.pay),
                    "covered_wages": U128(r.covered_wages), "allowance": U128(r.allowance),
                    "uncovered": U128(r.uncovered), "returned_to_ship": U128(r.returned) }),
        );
        self.pay_berth_money(&token, &holder, &berth, ship_id, r.pay, true, "berthright guarantee")
    }

    /// Token entry point: `{"fund": ship_id}`.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        #[near(serializers = [json])]
        struct Msg {
            fund: U64,
        }
        let parsed: Msg = serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("E_BAD_MSG"));
        let token = env::predecessor_account_id();
        let ship_id = parsed.fund.0;
        let ship = self.ship_mut(ship_id);
        require!(ship.token == token, "E_WRONG_TOKEN");
        require!(ship.status == ShipStatus::Active, "E_SHIP_NOT_ACTIVE");
        ship.books.unreserved += amount.0;
        ship.books.funded_total += amount.0;
        self.cover_ship_arrears(ship_id);
        let ship = self.ships.get(&ship_id).unwrap();
        events::emit(
            "funded",
            json!({ "ship_id": U64(ship_id), "from": sender_id, "amount": amount,
                    "unreserved": U128(ship.books.unreserved), "arrears": U128(ship.books.arrears) }),
        );
        PromiseOrValue::Value(U128(0))
    }

    // ---------- callbacks ----------

    #[private]
    pub fn on_paid(&mut self, berth: AccountId, ship_id: U64, amount: U128, to_holder: bool) -> bool {
        if near_sdk::is_promise_success() {
            return true;
        }
        if let Some(mut b) = self.berths.remove(&berth) {
            let ship = self.ships.get_mut(&ship_id.0).unwrap();
            ledger::restore_payable(&mut ship.books, &mut b.accrual, amount.0);
            if to_holder {
                b.paid_to_holder -= amount.0;
            } else {
                b.paid_to_berth -= amount.0;
            }
            self.berths.insert(berth.clone(), b);
        }
        events::emit("payment_failed", json!({ "ship_id": ship_id, "berth": berth, "amount": amount }));
        false
    }

    #[private]
    pub fn on_withdrawn(&mut self, ship_id: U64, amount: U128) -> bool {
        if near_sdk::is_promise_success() {
            return true;
        }
        let ship = self.ship_mut(ship_id.0);
        ship.books.withdrawn_total -= amount.0;
        ship.books.unreserved += amount.0;
        events::emit("payment_failed", json!({ "ship_id": ship_id, "amount": amount, "kind": "withdrawal" }));
        false
    }

    // ---------- views ----------

    pub fn get_ship(&self, ship_id: U64) -> Option<ShipView> {
        self.ships.get(&ship_id.0).map(|s| ship_view(ship_id.0, s))
    }

    pub fn list_ships(&self, from_index: Option<U64>, limit: Option<u64>) -> Vec<ShipView> {
        let from = from_index.map_or(0, |f| f.0);
        let limit = limit.unwrap_or(20).min(50);
        (from..self.next_ship_id)
            .rev()
            .take(limit as usize)
            .filter_map(|id| self.ships.get(&id).map(|s| ship_view(id, s)))
            .collect()
    }

    pub fn ship_count(&self) -> U64 {
        U64(self.next_ship_id)
    }

    pub fn get_berth(&self, berth: AccountId) -> Option<BerthView> {
        let b = self.berths.get(&berth)?;
        let ship = self.ships.get(&b.ship_id)?;
        let now = env::block_timestamp();
        let due = if b.status == BerthStatus::Signed {
            b.accrual.preview(ship.abandoned_at.unwrap_or(now)).0
        } else {
            0
        };
        Some(BerthView {
            berth: berth.clone(),
            ship_id: U64(b.ship_id),
            daily_wage: U128(b.daily_wage),
            contract_secs: U64(b.contract_secs),
            sea_hash: b.sea_hash.clone(),
            holder: b.holder.clone(),
            rotation_seq: U64(b.rotation_seq),
            status: b.status.clone(),
            signed_on_at_ns: U64(b.accrual.signed_on_at),
            settled_through_ns: U64(b.accrual.settled_through),
            contract_end_ns: U64(if b.accrual.signed_on_at == 0 { 0 } else { b.accrual.contract_end() }),
            carry: U128(b.accrual.carry),
            reserve: U128(b.accrual.reserve),
            reserve_needed: U128(ledger::reserve_for(b.daily_wage, ship.reserve_months, ship.repatriation_allowance)),
            payable: U128(b.accrual.payable),
            arrears: U128(b.accrual.arrears),
            earned: U128(b.accrual.earned),
            due_now: U128(due),
            paid_to_berth: U128(b.paid_to_berth),
            paid_to_holder: U128(b.paid_to_holder),
            uncovered: U128(b.uncovered),
        })
    }

    pub fn berth_history(&self, berth: AccountId) -> Vec<HistoryEntry> {
        self.history.get(&berth).cloned().unwrap_or_default()
    }

    pub fn quote_settle(&self, berth: AccountId) -> SettleQuote {
        let b = self.berths.get(&berth).unwrap_or_else(|| env::panic_str("E_NO_BERTH"));
        let ship = self.ships.get(&b.ship_id).unwrap();
        let now = env::block_timestamp();
        let (due, carry, _) = if b.status == BerthStatus::Signed {
            b.accrual.preview(ship.abandoned_at.unwrap_or(now))
        } else {
            (0, b.accrual.carry, 0)
        };
        let npd = b.accrual.ns_per_day as u128;
        let next = if b.daily_wage == 0 || b.status != BerthStatus::Signed {
            0
        } else {
            // Time until the carry reaches the next whole unit, rounded up to a second.
            ((npd - carry).div_ceil(b.daily_wage) as u64).div_ceil(NS)
        };
        SettleQuote {
            due_now: U128(due),
            payable: U128(b.accrual.payable),
            arrears: U128(b.accrual.arrears),
            secs_to_next_unit: U64(next),
        }
    }

    pub fn coverage(&self, ship_id: U64) -> Coverage {
        let ship = self.ships.get(&ship_id.0).unwrap_or_else(|| env::panic_str("E_NO_SHIP"));
        let now = env::block_timestamp();
        let mut monthly: u128 = 0;
        let mut virtual_arrears = ship.books.arrears;
        let mut pending: u128 = 0;
        for id in &ship.berths {
            let b = self.berths.get(id).unwrap();
            if b.status == BerthStatus::Signed {
                monthly += b.daily_wage * ledger::MONTH_DAYS;
                pending += b.accrual.preview(ship.abandoned_at.unwrap_or(now)).0;
            }
        }
        let free = ship.books.unreserved.saturating_sub(pending);
        if pending > ship.books.unreserved {
            virtual_arrears += pending - ship.books.unreserved;
        }
        let on_board = ship.books.reserved + free;
        let months_x100 = if monthly == 0 { 0 } else { (on_board * 100 / monthly) as u64 };
        let since = ship.books.arrears_since;
        Coverage {
            ship_id,
            months_on_board_x100: U64(months_x100),
            reserved: U128(ship.books.reserved),
            unreserved: U128(ship.books.unreserved),
            monthly_wage_bill: U128(monthly),
            arrears: U128(virtual_arrears),
            arrears_age_secs: since.map(|s| U64(now.saturating_sub(s) / NS)),
            grace_left_secs: since.map(|s| {
                U64(s.saturating_add(ship.grace_secs * NS).saturating_sub(now) / NS)
            }),
            status: ship.status.clone(),
        }
    }

    /// One line per berth, modelled on a master's wage account. Days are counted inside the
    /// window [from_ns, to_ns) for the current stint.
    pub fn portage_bill(&self, ship_id: U64, from_ns: Option<U64>, to_ns: Option<U64>) -> Vec<BillLine> {
        let ship = self.ships.get(&ship_id.0).unwrap_or_else(|| env::panic_str("E_NO_SHIP"));
        let now = env::block_timestamp();
        let from = from_ns.map_or(0, |f| f.0);
        let to = to_ns.map_or(now, |t| t.0.min(now));
        ship.berths
            .iter()
            .map(|id| {
                let b = self.berths.get(id).unwrap();
                let start = b.accrual.signed_on_at.max(from);
                let stop = b.accrual.settled_through.min(to).max(if b.status == BerthStatus::Signed { to.min(b.accrual.contract_end()) } else { 0 });
                let ns = if b.accrual.signed_on_at == 0 || stop <= start { 0 } else { (stop - start) as u128 };
                BillLine {
                    berth: id.clone(),
                    holder: b.holder.clone(),
                    status: b.status.clone(),
                    days_x100: U64((ns * 100 / b.accrual.ns_per_day.max(1) as u128) as u64),
                    daily_wage: U128(b.daily_wage),
                    earned: U128(b.accrual.earned),
                    paid_to_berth: U128(b.paid_to_berth),
                    paid_to_holder: U128(b.paid_to_holder),
                    payable: U128(b.accrual.payable),
                    arrears: U128(b.accrual.arrears),
                    reserve: U128(b.accrual.reserve),
                }
            })
            .collect()
    }

    pub fn config(&self) -> near_sdk::serde_json::Value {
        json!({
            "registry": self.registry, "registrar": self.registrar,
            "standard": events::STANDARD, "version": events::VERSION,
            "min_reserve_months": MIN_RESERVE_MONTHS, "max_grace_days": MAX_GRACE_DAYS,
            "allowed_secs_per_day": ALLOWED_SECS_PER_DAY, "max_berths": MAX_BERTHS,
        })
    }
}

// ---------- internals ----------

impl Portage {
    fn ship_mut(&mut self, id: u64) -> &mut Ship {
        self.ships.get_mut(&id).unwrap_or_else(|| env::panic_str("E_NO_SHIP"))
    }

    fn accrue_berth(&mut self, berth: &AccountId, now: u64) {
        let Some(mut b) = self.berths.remove(berth) else { return };
        if b.status == BerthStatus::Signed {
            let ship = self.ships.get_mut(&b.ship_id).unwrap();
            let had = ship.books.arrears_since;
            ledger::accrue(&mut ship.books, &mut b.accrual, ship.abandoned_at.unwrap_or(now));
            if had.is_none() {
                if let Some(since) = ship.books.arrears_since {
                    events::emit("arrears_started", json!({ "ship_id": U64(b.ship_id), "since": U64(since), "arrears": U128(ship.books.arrears) }));
                }
            }
        }
        self.berths.insert(berth.clone(), b);
    }

    /// Books every signed berth's wages up to now (no transfers). Used before any decision that
    /// depends on what the ship owes.
    fn accrue_ship(&mut self, ship_id: u64, now: u64) {
        let ids = self.ships.get(&ship_id).unwrap_or_else(|| env::panic_str("E_NO_SHIP")).berths.clone();
        for id in &ids {
            self.accrue_berth(id, now);
        }
    }

    /// Unreserved money goes to unpaid arrears first, berth by berth in the order they opened.
    fn cover_ship_arrears(&mut self, ship_id: u64) {
        let ids = self.ships.get(&ship_id).unwrap().berths.clone();
        for id in &ids {
            let mut b = self.berths.remove(id).unwrap();
            let ship = self.ships.get_mut(&ship_id).unwrap();
            ledger::cover_arrears(&mut ship.books, &mut b.accrual);
            self.berths.insert(id.clone(), b);
        }
        let ship = self.ships.get_mut(&ship_id).unwrap();
        ledger::clear_arrears_clock(&mut ship.books);
    }

    #[allow(clippy::too_many_arguments)]
    fn push_history(&mut self, berth: &AccountId, kind: &str, holder: &AccountId, ship_id: u64, at: u64, from: u64, earned: u128, paid: u128, note: &str) {
        let mut list = self.history.get(berth).cloned().unwrap_or_default();
        list.push(HistoryEntry {
            kind: kind.into(),
            holder: holder.clone(),
            ship_id: U64(ship_id),
            at_ns: U64(at),
            from_ns: U64(from),
            earned: U128(earned),
            paid: U128(paid),
            note: note.into(),
        });
        if list.len() > HISTORY_LEN {
            let excess = list.len() - HISTORY_LEN;
            list.drain(0..excess);
        }
        self.history.insert(berth.clone(), list);
    }

    #[allow(clippy::too_many_arguments)]
    fn pay_berth_money(&self, token: &AccountId, to: &AccountId, berth: &AccountId, ship_id: u64, amount: u128, to_holder: bool, memo: &str) -> Promise {
        pay_out(token, to, amount, memo).then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_ON_PAID)
                .on_paid(berth.clone(), U64(ship_id), U128(amount), to_holder),
        )
    }
}

/// Registers the receiver on the token if needed (a standard token refunds the deposit when it
/// is already registered), then transfers.
fn pay_out(token: &AccountId, to: &AccountId, amount: u128, memo: &str) -> Promise {
    ext_ft::ext(token.clone())
        .with_attached_deposit(STORAGE_DEPOSIT)
        .with_static_gas(GAS_STORAGE_DEPOSIT)
        .storage_deposit(Some(to.clone()), Some(true))
        .then(
            ext_ft::ext(token.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_FT_TRANSFER)
                .ft_transfer(to.clone(), U128(amount), Some(memo.to_string())),
        )
}

fn ship_view(id: u64, s: &Ship) -> ShipView {
    ShipView {
        ship_id: U64(id),
        owner: s.owner.clone(),
        name: s.name.clone(),
        imo: s.imo.clone(),
        token: s.token.clone(),
        secs_per_day: U64(s.secs_per_day),
        reserve_months: s.reserve_months,
        grace_secs: U64(s.grace_secs),
        repatriation_allowance: U128(s.repatriation_allowance),
        unreserved: U128(s.books.unreserved),
        reserved: U128(s.books.reserved),
        payable: U128(s.books.payable),
        arrears: U128(s.books.arrears),
        arrears_since_ns: s.books.arrears_since.map(U64),
        status: s.status.clone(),
        abandoned_at_ns: s.abandoned_at.map(U64),
        berths: s.berths.clone(),
        funded_total: U128(s.books.funded_total),
        paid_total: U128(s.books.paid_total),
        withdrawn_total: U128(s.books.withdrawn_total),
        created_at_ns: U64(s.created_at),
    }
}

fn is_hex32(s: &str) -> bool {
    s.len() == 64 && s.chars().all(|c| c.is_ascii_hexdigit())
}
