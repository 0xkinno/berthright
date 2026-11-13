//! Pure money arithmetic. No storage, no environment: everything here takes `now` as an argument,
//! so the property tests can drive any history and check the books.

use near_sdk::near;

/// A ship month is 30 ship days, the convention MLC wage accounts use for monthly figures.
pub const MONTH_DAYS: u128 = 30;

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum ShipStatus {
    Active,
    Abandoned,
    Closed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum BerthStatus {
    Open,
    Signed,
    Interrupted,
    SignedOff,
    Released,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Books {
    pub unreserved: u128,
    pub reserved: u128,
    /// Wages already earned and earmarked for a berth, waiting for the transfer.
    pub payable: u128,
    /// Wages earned that the chest could not cover. Not money: a debt of the shipowner.
    pub arrears: u128,
    pub arrears_since: Option<u64>,
    pub funded_total: u128,
    pub paid_total: u128,
    pub withdrawn_total: u128,
}

impl Books {
    pub fn new() -> Self {
        Self {
            unreserved: 0,
            reserved: 0,
            payable: 0,
            arrears: 0,
            arrears_since: None,
            funded_total: 0,
            paid_total: 0,
            withdrawn_total: 0,
        }
    }

    /// Every token the chest ever received is in exactly one of these places.
    pub fn conserved(&self) -> bool {
        self.funded_total
            == self.unreserved + self.reserved + self.payable + self.paid_total + self.withdrawn_total
    }
}

impl Default for Books {
    fn default() -> Self {
        Self::new()
    }
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Accrual {
    pub daily_wage: u128,
    /// Length of one ship day in nanoseconds (block time unit).
    pub ns_per_day: u64,
    pub signed_on_at: u64,
    pub contract_ns: u64,
    pub settled_through: u64,
    /// Remainder numerator: (wage seconds not yet a whole base unit). paid_units * ns_per_day
    /// + carry == daily_wage * nanoseconds accrued, exactly.
    pub carry: u128,
    pub reserve: u128,
    pub payable: u128,
    pub arrears: u128,
    /// Everything earned in this stint, whole units.
    pub earned: u128,
}

impl Accrual {
    pub fn contract_end(&self) -> u64 {
        self.signed_on_at.saturating_add(self.contract_ns)
    }

    /// Whole units earned between `settled_through` and `cutoff`, with the carry, without
    /// changing anything.
    pub fn preview(&self, cutoff: u64) -> (u128, u128, u64) {
        let cutoff = cutoff.min(self.contract_end());
        if cutoff <= self.settled_through {
            return (0, self.carry, self.settled_through);
        }
        let elapsed = (cutoff - self.settled_through) as u128;
        let numer = self.daily_wage * elapsed + self.carry;
        let spd = self.ns_per_day as u128;
        (numer / spd, numer % spd, cutoff)
    }

    /// Wages left in the contract after `from`, rounded down.
    pub fn remaining_wages(&self, from: u64) -> u128 {
        let end = self.contract_end();
        if from >= end {
            return 0;
        }
        self.daily_wage * (end - from) as u128 / self.ns_per_day as u128
    }
}

/// Reserve a berth needs on board before sign-on: `reserve_months` of wages plus the fare home.
pub fn reserve_for(daily_wage: u128, reserve_months: u8, repatriation_allowance: u128) -> u128 {
    daily_wage * MONTH_DAYS * reserve_months as u128 + repatriation_allowance
}

/// Accrues wages up to `cutoff` and funds them from the unreserved pool. Returns the newly
/// earned whole units. Arrears get a start time: the moment the pool actually ran dry.
pub fn accrue(books: &mut Books, a: &mut Accrual, cutoff: u64) -> u128 {
    let started_from = a.settled_through;
    let (units, carry, through) = a.preview(cutoff);
    a.carry = carry;
    a.settled_through = through;
    a.earned += units;
    let had_arrears = a.arrears > 0;
    let owed = units + a.arrears;
    books.arrears -= a.arrears;
    let take = owed.min(books.unreserved);
    books.unreserved -= take;
    books.payable += take;
    a.payable += take;
    a.arrears = owed - take;
    books.arrears += a.arrears;
    if a.arrears > 0 && !had_arrears {
        // The pool covered `take` units; the first unpaid unit fell due right after that.
        let covered_ns = if a.daily_wage == 0 {
            0
        } else {
            (take * a.ns_per_day as u128 / a.daily_wage) as u64
        };
        let ran_dry = started_from.saturating_add(covered_ns).min(through);
        books.arrears_since = Some(books.arrears_since.map_or(ran_dry, |s| s.min(ran_dry)));
    }
    units
}

/// Moves unreserved money onto a berth's unpaid arrears. Used after funding or after a
/// reserve returns to the pool.
pub fn cover_arrears(books: &mut Books, a: &mut Accrual) {
    if a.arrears == 0 || books.unreserved == 0 {
        return;
    }
    let take = a.arrears.min(books.unreserved);
    books.unreserved -= take;
    books.arrears -= take;
    books.payable += take;
    a.payable += take;
    a.arrears -= take;
}

pub fn clear_arrears_clock(books: &mut Books) {
    if books.arrears == 0 {
        books.arrears_since = None;
    }
}

pub fn lock_reserve(books: &mut Books, a: &mut Accrual, reserve: u128) -> bool {
    if books.unreserved < reserve {
        return false;
    }
    books.unreserved -= reserve;
    books.reserved += reserve;
    a.reserve = reserve;
    true
}

pub fn unlock_reserve(books: &mut Books, a: &mut Accrual) {
    books.reserved -= a.reserve;
    books.unreserved += a.reserve;
    a.reserve = 0;
}

/// What release pays the holder after abandonment: wages already earmarked, then the locked
/// reserve covering arrears and the rest of the contract up to the reserve's wage part, then
/// the fare home. Whatever the reserve does not need returns to the pool. Never more than owed.
pub struct Release {
    pub pay: u128,
    pub covered_wages: u128,
    pub allowance: u128,
    pub uncovered: u128,
    pub returned: u128,
}

pub fn release(books: &mut Books, a: &mut Accrual, abandoned_at: u64, allowance: u128) -> Release {
    let allowance = allowance.min(a.reserve);
    let wage_reserve = a.reserve - allowance;
    let remaining = a.remaining_wages(abandoned_at);
    let owed = a.arrears + remaining;
    let covered_wages = owed.min(wage_reserve);
    let uncovered = owed - covered_wages;
    books.arrears -= a.arrears;
    a.arrears = 0;
    let returned = a.reserve - covered_wages - allowance;
    books.reserved -= a.reserve;
    books.unreserved += returned;
    let earmarked = a.payable;
    books.payable -= earmarked;
    a.payable = 0;
    a.reserve = 0;
    let pay = earmarked + covered_wages + allowance;
    books.paid_total += pay;
    Release {
        pay,
        covered_wages,
        allowance,
        uncovered,
        returned,
    }
}

/// Takes the berth's earmarked wages out for a transfer. The caller restores them if the
/// transfer fails.
pub fn take_payable(books: &mut Books, a: &mut Accrual) -> u128 {
    let amount = a.payable;
    books.payable -= amount;
    books.paid_total += amount;
    a.payable = 0;
    amount
}

pub fn restore_payable(books: &mut Books, a: &mut Accrual, amount: u128) {
    books.paid_total -= amount;
    books.payable += amount;
    a.payable += amount;
}
