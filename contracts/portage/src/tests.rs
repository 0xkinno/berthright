//! Unit and property tests. Each test name is a claim the README links to.

use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, AccountId, NearToken};
use proptest::prelude::*;

const NS_: u64 = 1_000_000_000;
const SPD: u64 = 10; // fast-clock ship: one ship day is 10 seconds
const DAY: u64 = SPD * NS_;
const WAGE: u128 = 50_000_000; // 50 tUSD per day
const ALLOW: u128 = 1_000_000_000; // 1,000 tUSD fare home
const HASH: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn portage() -> AccountId {
    acc("portage.testnet")
}
fn owner() -> AccountId {
    acc("kestrel-bulk.testnet")
}
fn arjun() -> AccountId {
    acc("arjun.testnet")
}
fn relief() -> AccountId {
    acc("relief.testnet")
}
fn token() -> AccountId {
    acc("tusd.testnet")
}
fn registry() -> AccountId {
    acc("registry.root.testnet")
}
fn berth() -> AccountId {
    acc("ab2-kestrel.crew.root.testnet")
}

fn ctx(pred: AccountId, ts: u64, deposit: NearToken) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(portage())
        .predecessor_account_id(pred)
        .block_timestamp(ts)
        .attached_deposit(deposit)
        .account_balance(NearToken::from_near(10));
    testing_env!(b.build());
}

fn reserve() -> u128 {
    ledger::reserve_for(WAGE, 4, ALLOW)
}

fn item(owner_id: AccountId, seq: u64, status: &str) -> NftItemInfo {
    NftItemInfo {
        spec: SHARDED_ITEM_SPEC.into(),
        init: true,
        status: status.into(),
        collection_id: registry(),
        token_id: berth().to_string(),
        owner_id,
        rotation_seq: U64(seq),
        rotation_epoch: 4,
    }
}

fn tok(owner_id: AccountId) -> Option<NftToken> {
    Some(NftToken { token_id: berth().to_string(), owner_id })
}

/// A ship with one open berth, funded with `fund` tUSD units.
fn setup(fund: u128) -> Portage {
    ctx(acc("deployer.testnet"), DAY, NearToken::from_yoctonear(0));
    // Each test (and each property case) starts from empty contract storage.
    near_sdk::mock::with_mocked_blockchain(|b| drop(b.take_storage()));
    ctx(acc("deployer.testnet"), DAY, NearToken::from_yoctonear(0));
    let mut p = Portage::new(registry(), acc("crew.root.testnet"));
    ctx(owner(), DAY, SHIP_DEPOSIT);
    p.create_ship("MV Kestrel (fictional)".into(), "IMO 0000000".into(), token(), U64(SPD), 4, U64(14), U128(ALLOW));
    ctx(owner(), DAY, BERTH_DEPOSIT);
    p.open_berth(U64(0), berth(), U128(WAGE), U64(270), HASH.into());
    if fund > 0 {
        ctx(token(), DAY, NearToken::from_yoctonear(0));
        let _ = p.ft_on_transfer(owner(), U128(fund), r#"{"fund":"0"}"#.into());
    }
    p
}

fn sign_on_at(p: &mut Portage, ts: u64, who: AccountId, wage: u128) -> bool {
    ctx(portage(), ts, NearToken::from_yoctonear(0));
    p.on_sign_on(berth(), who.clone(), U128(wage), HASH.into(), Ok(item(who.clone(), 1, "Active")), Ok(tok(who)))
}

fn books(p: &Portage) -> ShipView {
    p.get_ship(U64(0)).unwrap()
}

fn conserved(p: &Portage) -> bool {
    let s = books(p);
    s.funded_total.0 == s.unreserved.0 + s.reserved.0 + s.payable.0 + s.paid_total.0 + s.withdrawn_total.0
}

#[test]
fn sign_on_is_refused_until_four_months_are_on_board() {
    let mut p = setup(reserve() - 1);
    assert!(!sign_on_at(&mut p, 2 * DAY, arjun(), WAGE), "one unit short of the reserve must refuse");
    assert_eq!(p.get_berth(berth()).unwrap().status, BerthStatus::Open);
    ctx(token(), 2 * DAY, NearToken::from_yoctonear(0));
    let _ = p.ft_on_transfer(owner(), U128(1), r#"{"fund":"0"}"#.into());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    let s = books(&p);
    assert_eq!(s.reserved.0, reserve());
    assert_eq!(s.unreserved.0, 0);
}

#[test]
#[should_panic(expected = "E_RESERVE_BELOW_MLC")]
fn a_ship_cannot_promise_less_than_four_months() {
    ctx(acc("deployer.testnet"), DAY, NearToken::from_yoctonear(0));
    let mut p = Portage::new(registry(), acc("crew.root.testnet"));
    ctx(owner(), DAY, SHIP_DEPOSIT);
    p.create_ship("x".into(), "".into(), token(), U64(SPD), 3, U64(14), U128(0));
}

#[test]
#[should_panic(expected = "E_GRACE_TOO_LONG")]
fn a_ship_cannot_set_a_grace_longer_than_thirty_days() {
    ctx(acc("deployer.testnet"), DAY, NearToken::from_yoctonear(0));
    let mut p = Portage::new(registry(), acc("crew.root.testnet"));
    ctx(owner(), DAY, SHIP_DEPOSIT);
    p.create_ship("x".into(), "".into(), token(), U64(SPD), 4, U64(31), U128(0));
}

#[test]
fn sign_on_is_refused_when_the_wage_differs_from_the_crew_members_contract() {
    let mut p = setup(reserve() * 2);
    assert!(!sign_on_at(&mut p, 2 * DAY, arjun(), WAGE - 1));
    ctx(portage(), 2 * DAY, NearToken::from_yoctonear(0));
    let wrong_hash = "b".repeat(64);
    assert!(!p.on_sign_on(berth(), arjun(), U128(WAGE), wrong_hash, Ok(item(arjun(), 1, "Active")), Ok(tok(arjun()))));
    assert_eq!(p.get_berth(berth()).unwrap().status, BerthStatus::Open);
    assert_eq!(books(&p).reserved.0, 0);
}

#[test]
fn a_non_holder_cannot_sign_on() {
    let mut p = setup(reserve() * 2);
    ctx(portage(), 2 * DAY, NearToken::from_yoctonear(0));
    // The berth says Arjun holds it; a stranger tries.
    assert!(!p.on_sign_on(berth(), relief(), U128(WAGE), HASH.into(), Ok(item(arjun(), 1, "Active")), Ok(tok(arjun()))));
    // Item and collection disagree: refused even for the item's owner.
    assert!(!p.on_sign_on(berth(), arjun(), U128(WAGE), HASH.into(), Ok(item(arjun(), 1, "Active")), Ok(tok(relief()))));
    // A frozen or expired berth is refused.
    assert!(!p.on_sign_on(berth(), arjun(), U128(WAGE), HASH.into(), Ok(item(arjun(), 1, "Frozen")), Ok(tok(arjun()))));
    // A different collection is refused.
    let mut foreign = item(arjun(), 1, "Active");
    foreign.collection_id = acc("other-registry.testnet");
    assert!(!p.on_sign_on(berth(), arjun(), U128(WAGE), HASH.into(), Ok(foreign), Ok(tok(arjun()))));
    assert_eq!(p.get_berth(berth()).unwrap().status, BerthStatus::Open);
}

#[test]
fn wages_accrue_into_the_berth_and_settle_pays_the_berth_account() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 5 * DAY, NearToken::from_yoctonear(0));
    let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 1, "Active")));
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.paid_to_berth.0, 3 * WAGE);
    assert_eq!(b.payable.0, 0);
    assert!(conserved(&p));
}

#[test]
fn a_frozen_berth_does_not_lose_wages() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 4 * DAY, NearToken::from_yoctonear(0));
    let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 1, "Frozen")));
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.status, BerthStatus::Signed, "freezing is not leaving the ship");
    assert_eq!(b.paid_to_berth.0, 2 * WAGE, "a frozen berth still receives plain token transfers");
}

#[test]
fn an_expired_berth_is_paid_to_the_holders_own_account() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 4 * DAY, NearToken::from_yoctonear(0));
    let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 1, "Expired")));
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.paid_to_holder.0, 2 * WAGE);
    assert_eq!(b.paid_to_berth.0, 0);
}

#[test]
fn the_owner_cannot_withdraw_the_reserve() {
    let mut p = setup(reserve() + 5 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    // After 2 days, 2 days of wages are earmarked; 3 days are free.
    ctx(owner(), 4 * DAY, NearToken::from_yoctonear(0));
    let free = 3 * WAGE;
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut q = setup(reserve() + 5 * WAGE);
        sign_on_at(&mut q, 2 * DAY, arjun(), WAGE);
        ctx(owner(), 4 * DAY, NearToken::from_yoctonear(0));
        let _ = q.withdraw_surplus(U64(0), U128(free + 1));
    }));
    assert!(r.is_err(), "withdrawing one unit of the reserve or earned wages must panic");
    let _ = p.withdraw_surplus(U64(0), U128(free));
    let s = books(&p);
    assert_eq!(s.reserved.0, reserve());
    assert_eq!(s.withdrawn_total.0, free);
    assert!(conserved(&p));
}

#[test]
#[should_panic(expected = "E_NOT_YET_ABANDONED")]
fn abandonment_cannot_be_declared_before_the_grace_ends() {
    let mut p = setup(reserve());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    // The pool is empty: the first day of wages is unpaid from the start. 14 ship days of grace.
    ctx(acc("anyone.testnet"), 2 * DAY + 14 * DAY - 1, NearToken::from_yoctonear(0));
    p.declare_abandonment(U64(0));
}

#[test]
fn abandonment_releases_four_months_and_the_fare_home_to_each_holders_own_account() {
    let mut p = setup(reserve());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    let at = 2 * DAY + 15 * DAY;
    ctx(acc("anyone.testnet"), at, NearToken::from_yoctonear(0));
    p.declare_abandonment(U64(0));
    assert_eq!(books(&p).status, ShipStatus::Abandoned);
    let _ = p.release_guarantee(berth());
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.status, BerthStatus::Released);
    // 15 days unpaid plus the rest of a 270-day contract, capped at four months (120 days), plus the fare home.
    assert_eq!(b.paid_to_holder.0, 120 * WAGE + ALLOW);
    assert_eq!(b.paid_to_berth.0, 0, "the release never goes to the berth, only to the account that signed on");
    assert_eq!(b.uncovered.0, (15 + 255) * WAGE - 120 * WAGE, "the shortfall beyond four months is stated, not hidden");
    let s = books(&p);
    assert_eq!(s.reserved.0, 0);
    assert_eq!(s.arrears.0, 0);
    assert!(conserved(&p));
}

#[test]
fn release_never_pays_more_than_is_owed() {
    // A short contract: 10 days. Abandoned on day 4 with 2 days unpaid. Owed = 2 + 6 days.
    ctx(acc("deployer.testnet"), DAY, NearToken::from_yoctonear(0));
    let mut p = Portage::new(registry(), acc("crew.root.testnet"));
    ctx(owner(), DAY, SHIP_DEPOSIT);
    p.create_ship("s".into(), "".into(), token(), U64(SPD), 4, U64(1), U128(ALLOW));
    ctx(owner(), DAY, BERTH_DEPOSIT);
    p.open_berth(U64(0), berth(), U128(WAGE), U64(10), HASH.into());
    ctx(token(), DAY, NearToken::from_yoctonear(0));
    let _ = p.ft_on_transfer(owner(), U128(reserve() + 2 * WAGE), r#"{"fund":"0"}"#.into());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(acc("x.testnet"), 7 * DAY, NearToken::from_yoctonear(0));
    p.declare_abandonment(U64(0));
    let _ = p.release_guarantee(berth());
    let b = p.get_berth(berth()).unwrap();
    // Paid: 2 funded days + (3 unpaid days to day 7 + 5 remaining contract days) + fare home.
    assert_eq!(b.paid_to_holder.0, 2 * WAGE + 8 * WAGE + ALLOW);
    assert_eq!(b.uncovered.0, 0);
    let s = books(&p);
    assert_eq!(s.unreserved.0, reserve() - 8 * WAGE - ALLOW, "the unneeded reserve goes back to the ship");
    assert!(conserved(&p));
}

#[test]
#[should_panic(expected = "E_ALREADY_RELEASED")]
fn release_guarantee_pays_once() {
    let mut p = setup(reserve());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(acc("anyone.testnet"), 20 * DAY, NearToken::from_yoctonear(0));
    p.declare_abandonment(U64(0));
    let _ = p.release_guarantee(berth());
    let _ = p.release_guarantee(berth());
}

#[test]
#[should_panic(expected = "E_NOT_ABANDONED")]
fn release_is_refused_while_the_ship_is_paying() {
    let mut p = setup(reserve() + 100 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(acc("anyone.testnet"), 20 * DAY, NearToken::from_yoctonear(0));
    let _ = p.release_guarantee(berth());
}

#[test]
fn an_unannounced_hand_over_pays_the_recorded_holder_and_never_the_berth() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 5 * DAY, NearToken::from_yoctonear(0));
    // The berth NFT moved to a relief without a sign-off: the rotation counter went up.
    let _ = p.on_settle_checked(berth(), Ok(item(relief(), 2, "Active")));
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.status, BerthStatus::Interrupted);
    assert_eq!(b.paid_to_berth.0, 0);
    assert_eq!(b.paid_to_holder.0, 3 * WAGE);
    assert_eq!(b.reserve.0, 0, "the reserve returns to the ship once nobody is signed on");
    let h = p.berth_history(berth());
    assert_eq!(h.last().unwrap().kind, "interrupted");
    assert!(conserved(&p));
}

#[test]
fn a_rotation_back_to_the_same_holder_is_still_an_interruption() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 5 * DAY, NearToken::from_yoctonear(0));
    let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 3, "Active")));
    assert_eq!(p.get_berth(berth()).unwrap().status, BerthStatus::Interrupted);
}

#[test]
fn sign_off_pays_the_final_wage_to_the_crew_members_own_account() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(arjun(), 6 * DAY, NearToken::from_yoctonear(0));
    let _ = p.sign_off(berth());
    let b = p.get_berth(berth()).unwrap();
    assert_eq!(b.status, BerthStatus::SignedOff);
    assert_eq!(b.paid_to_holder.0, 4 * WAGE);
    assert_eq!(b.paid_to_berth.0, 0);
    assert_eq!(books(&p).reserved.0, 0);
    let h = p.berth_history(berth());
    assert_eq!(h.len(), 2);
    assert_eq!(h[1].kind, "signed_off");
    assert_eq!(h[1].earned.0, 4 * WAGE);
    // The relief can now sign on to the same berth.
    ctx(portage(), 7 * DAY, NearToken::from_yoctonear(0));
    assert!(p.on_sign_on(berth(), relief(), U128(WAGE), HASH.into(), Ok(item(relief(), 2, "Active")), Ok(tok(relief()))));
    assert!(conserved(&p));
}

#[test]
#[should_panic(expected = "E_NOT_BERTH_HOLDER")]
fn only_the_holder_can_sign_off() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(owner(), 6 * DAY, NearToken::from_yoctonear(0));
    let _ = p.sign_off(berth());
}

#[test]
fn funding_after_arrears_pays_the_crew_first_and_stops_the_clock() {
    let mut p = setup(reserve());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(acc("anyone.testnet"), 5 * DAY, NearToken::from_yoctonear(0));
    let _ = p.settle(berth());
    let s = books(&p);
    assert_eq!(s.arrears.0, 3 * WAGE);
    assert_eq!(s.arrears_since_ns.unwrap().0, 2 * DAY, "arrears start when the first unpaid wage fell due");
    ctx(token(), 6 * DAY, NearToken::from_yoctonear(0));
    let _ = p.ft_on_transfer(owner(), U128(10 * WAGE), r#"{"fund":"0"}"#.into());
    let s = books(&p);
    assert_eq!(s.arrears.0, 0);
    assert!(s.arrears_since_ns.is_none());
    assert_eq!(s.payable.0, 3 * WAGE);
    assert!(conserved(&p));
}

#[test]
#[should_panic(expected = "E_WRONG_TOKEN")]
fn funding_in_another_token_is_refused() {
    let mut p = setup(0);
    ctx(acc("fake-usd.testnet"), DAY, NearToken::from_yoctonear(0));
    let _ = p.ft_on_transfer(owner(), U128(1), r#"{"fund":"0"}"#.into());
}

#[test]
#[should_panic(expected = "E_NOT_A_CREW_NAME")]
fn a_berth_must_be_a_name_in_the_crew_namespace() {
    let mut p = setup(0);
    ctx(owner(), DAY, BERTH_DEPOSIT);
    p.open_berth(U64(0), acc("someone.testnet"), U128(WAGE), U64(10), HASH.into());
}

#[test]
#[should_panic(expected = "E_NOT_SHIP_OWNER")]
fn only_the_shipowner_opens_berths() {
    let mut p = setup(0);
    ctx(arjun(), DAY, BERTH_DEPOSIT);
    p.open_berth(U64(0), acc("oiler-kestrel.crew.root.testnet"), U128(WAGE), U64(10), HASH.into());
}

#[test]
#[should_panic(expected = "E_CREW_ON_BOARD")]
fn a_ship_cannot_close_with_crew_on_board() {
    let mut p = setup(reserve());
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(owner(), 3 * DAY, NearToken::from_yoctonear(0));
    p.close_ship(U64(0));
}

#[test]
fn a_failed_payment_puts_the_wages_back_on_board() {
    let mut p = setup(reserve() + 10 * WAGE);
    assert!(sign_on_at(&mut p, 2 * DAY, arjun(), WAGE));
    ctx(portage(), 5 * DAY, NearToken::from_yoctonear(0));
    let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 1, "Active")));
    // Simulate the token refusing the transfer.
    let mut b = VMContextBuilder::new();
    b.current_account_id(portage()).predecessor_account_id(portage()).block_timestamp(5 * DAY);
    testing_env!(b.build(), near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), vec![near_sdk::PromiseResult::Failed]);
    assert!(!p.on_paid(berth(), U64(0), U128(3 * WAGE), false));
    let v = p.get_berth(berth()).unwrap();
    assert_eq!(v.payable.0, 3 * WAGE);
    assert_eq!(v.paid_to_berth.0, 0);
    assert!(conserved(&p));
}

// ---------- property tests ----------

proptest! {
    #![proptest_config(ProptestConfig { cases: 10_000, .. ProptestConfig::default() })]

    #[test]
    fn wages_accrue_by_the_second_and_paid_plus_carry_equals_exact_accrual(
        wage in 1u128..10_000_000_000u128,
        spd_idx in 0usize..4,
        steps in proptest::collection::vec(1u64..5_000_000_000_000u64, 1..20),
    ) {
        let npd = ALLOWED_SECS_PER_DAY[spd_idx] * NS_;
        let mut books = ledger::Books::new();
        books.unreserved = u128::MAX / 4;
        books.funded_total = books.unreserved;
        let mut a = ledger::Accrual { daily_wage: wage, ns_per_day: npd, signed_on_at: 0, contract_ns: u64::MAX / 2,
            settled_through: 0, carry: 0, reserve: 0, payable: 0, arrears: 0, earned: 0 };
        let mut t: u64 = 0;
        for s in steps {
            t = t.saturating_add(s);
            ledger::accrue(&mut books, &mut a, t);
            prop_assert!(a.carry < npd as u128);
            prop_assert_eq!(a.earned * npd as u128 + a.carry, wage * t as u128);
        }
        prop_assert!(books.conserved());
    }

    #[test]
    fn money_is_conserved_across_any_history(
        ops in proptest::collection::vec((0u8..6, 1u64..40, 0u128..400_000_000u128), 1..40),
        start_fund in 0u128..20_000_000_000u128,
    ) {
        let mut p = setup(start_fund);
        let mut now = 2 * DAY;
        for (op, dt, amt) in ops {
            now += dt * NS_;
            match op {
                0 => { ctx(token(), now, NearToken::from_yoctonear(0)); let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { let _ = p.ft_on_transfer(owner(), U128(amt + 1), r#"{"fund":"0"}"#.into()); })); }
                1 => { sign_on_at(&mut p, now, arjun(), WAGE); }
                2 => { ctx(portage(), now, NearToken::from_yoctonear(0)); let _ = p.on_settle_checked(berth(), Ok(item(arjun(), 1, "Active"))); }
                3 => { ctx(owner(), now, NearToken::from_yoctonear(0)); let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { let _ = p.withdraw_surplus(U64(0), U128(amt + 1)); })); }
                4 => { ctx(arjun(), now, NearToken::from_yoctonear(0)); let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { let _ = p.sign_off(berth()); })); }
                _ => {
                    ctx(acc("x.testnet"), now, NearToken::from_yoctonear(0));
                    let declared = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| p.declare_abandonment(U64(0)))).is_ok();
                    if declared { let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| { let _ = p.release_guarantee(berth()); })); }
                }
            }
            prop_assert!(conserved(&p), "books broke after op {}", op);
            let s = books(&p);
            let b = p.get_berth(berth()).unwrap();
            if b.status == BerthStatus::Signed {
                prop_assert!(s.reserved.0 >= reserve(), "a signed berth always has its reserve locked");
            }
        }
    }
}
