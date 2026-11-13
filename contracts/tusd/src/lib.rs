//! Test Dollar (tUSD). A NEP-141 token with NEP-145 storage and NEP-148 metadata.
//! Anyone may draw 5,000 tUSD per day from the faucet until the total cap is reached.
//! It has no value and exists only so the Berthright wage chest can run on testnet.

use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue,
};

pub const DECIMALS: u8 = 6;
pub const ONE_TUSD: u128 = 1_000_000;
pub const FAUCET_PER_DAY: u128 = 5_000 * ONE_TUSD;
pub const FAUCET_TOTAL_CAP: u128 = 100_000_000 * ONE_TUSD;
const DAY_NS: u64 = 86_400 * 1_000_000_000;

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Token,
    Faucet,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Tusd {
    token: FungibleToken,
    last_draw_ns: LookupMap<AccountId, u64>,
    faucet_minted: u128,
}

#[near]
impl Tusd {
    #[init]
    pub fn new() -> Self {
        Self {
            token: FungibleToken::new(Key::Token),
            last_draw_ns: LookupMap::new(Key::Faucet),
            faucet_minted: 0,
        }
    }

    /// Mints up to 5,000 tUSD to the caller, at most once per 24 hours, and registers the
    /// caller for storage if needed (the token pays that storage from its own balance).
    pub fn faucet(&mut self, amount: Option<U128>) -> U128 {
        let who = env::predecessor_account_id();
        let amount = amount.map_or(FAUCET_PER_DAY, |a| a.0);
        require!(amount > 0 && amount <= FAUCET_PER_DAY, "E_FAUCET_AMOUNT");
        let now = env::block_timestamp();
        if let Some(last) = self.last_draw_ns.get(&who) {
            require!(now >= last.saturating_add(DAY_NS), "E_FAUCET_ONCE_PER_DAY");
        }
        require!(
            self.faucet_minted.saturating_add(amount) <= FAUCET_TOTAL_CAP,
            "E_FAUCET_CAP_REACHED"
        );
        if !self.token.accounts.contains_key(&who) {
            self.token.internal_register_account(&who);
        }
        self.last_draw_ns.insert(who.clone(), now);
        self.faucet_minted += amount;
        self.token.internal_deposit(&who, amount);
        near_contract_standards::fungible_token::events::FtMint {
            owner_id: &who,
            amount: U128(amount),
            memo: Some("faucet"),
        }
        .emit();
        U128(amount)
    }

    pub fn faucet_minted(&self) -> U128 {
        U128(self.faucet_minted)
    }

    pub fn faucet_next_draw_ns(&self, account_id: AccountId) -> near_sdk::json_types::U64 {
        near_sdk::json_types::U64(
            self.last_draw_ns
                .get(&account_id)
                .map_or(0, |t| t.saturating_add(DAY_NS)),
        )
    }
}

#[near]
impl FungibleTokenCore for Tusd {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Tusd {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, _burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        used.into()
    }
}

#[near]
impl StorageManagement for Tusd {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.internal_storage_unregister(force).is_some()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Tusd {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "Test Dollar".to_string(),
            symbol: "tUSD".to_string(),
            icon: Some(ICON.to_string()),
            reference: None,
            reference_hash: None,
            decimals: DECIMALS,
        }
    }
}

const ICON: &str = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2311140F'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23D4F25C' stroke-width='2'/%3E%3C/svg%3E";

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn ctx(who: AccountId, ts: u64) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(who).block_timestamp(ts);
        testing_env!(b.build());
    }

    #[test]
    fn faucet_pays_once_per_day_and_registers_the_caller() {
        ctx(accounts(0), 1);
        let mut t = Tusd::new();
        assert_eq!(t.faucet(None).0, FAUCET_PER_DAY);
        assert_eq!(t.ft_balance_of(accounts(0)).0, FAUCET_PER_DAY);
        ctx(accounts(0), 1 + DAY_NS);
        assert_eq!(t.faucet(Some(U128(10))).0, 10);
    }

    #[test]
    #[should_panic(expected = "E_FAUCET_ONCE_PER_DAY")]
    fn faucet_refuses_a_second_draw_the_same_day() {
        ctx(accounts(0), 1);
        let mut t = Tusd::new();
        t.faucet(None);
        t.faucet(None);
    }

    #[test]
    #[should_panic(expected = "E_FAUCET_AMOUNT")]
    fn faucet_refuses_more_than_the_daily_amount() {
        ctx(accounts(0), 1);
        let mut t = Tusd::new();
        t.faucet(Some(U128(FAUCET_PER_DAY + 1)));
    }
}
