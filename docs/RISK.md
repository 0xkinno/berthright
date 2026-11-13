# Risk

## Parameters stricter than the standard

| Parameter | MLC 2006 | Berthright | Enforced in |
|---|---|---|---|
| Wage security | up to 4 months, through an insurer claim | 4 months **locked before sign-on**, minimum; a ship with `reserve_months < 4` cannot be created | `create_ship` (`E_RESERVE_BELOW_MLC`), `on_sign_on` (`E_RESERVE_NOT_ON_BOARD`) |
| Abandonment trigger | 2 months unpaid | any wage unpaid for `grace_days` (1 to 30 ship days, default 14) after it fell due | `declare_abandonment` (`E_NOT_YET_ABANDONED`) |
| Repatriation | covered by the security | fixed `repatriation_allowance` per berth, locked with the reserve | `on_sign_on`, `release_guarantee` |
| Who pays out | insurer, after a claim | the contract, to the account that signed on, called by anyone | `release_guarantee` |
| Wage at sign-on | as written in the SEA | must equal the wage the crew member confirms, with the SEA hash, or sign-on is refused | `on_sign_on` (`E_WAGE_DIFFERS_FROM_YOUR_CONTRACT`) |
| Shipowner withdrawal | n/a | only money above earned wages and every reserve; never with wages unpaid; never after abandonment | `withdraw_surplus` (`E_RESERVE_LOCKED`, `E_SHIP_ABANDONED`) |

## Maximum loss for a crew member

Wages beyond four months, plus anything above the fare-home allowance. The berth card says it in
plain words: "Covered on board: 4 months. Not covered: anything beyond that." The release event
states the uncovered amount (`uncovered`) so nobody has to work it out.

## Rounding

- Integers only. Token amounts are u128 base units (tUSD has 6 decimals).
- Accrual is `daily_wage * elapsed_ns / ns_per_day`, rounded down. The remainder is kept per berth as
  `carry`, so `earned * ns_per_day + carry == daily_wage * elapsed_ns` exactly. Property-tested over
  10,000 random histories (`wages_accrue_by_the_second_and_paid_plus_carry_equals_exact_accrual`).
- Money is conserved: `funded = unreserved + reserved + payable + paid + withdrawn`, property-tested
  over 10,000 random histories of funding, sign-on, settle, withdraw, sign-off, abandonment and
  release (`money_is_conserved_across_any_history`).

## Issuer powers

- On testnet the token is `tUSD`, labelled "test dollars". It has no value and no admin.
- On mainnet a ship would use a real stablecoin. Circle can freeze USDC addresses; the berth card
  must say so when a mainnet token is used.
- The crew namespace is issued by a crew welfare trust (fictional), never the shipowner, because a
  namespace issuer has powers over names. On our testnet fleet the trust is a payment authority bound
  to an Open namespace: it can issue names but cannot freeze, move or reclaim a live berth. House of
  Stake's council keeps its own powers (see `docs/FRICTION.md`).

## Contract risk

- `portage` and `allotment` are deployed with no access keys, so nobody can upgrade or drain them.
  A bug cannot be patched in place; a fixed version would be a new account and new ships.
- An on-chain read of a berth can be stale by one or two blocks (the sharded-item draft says so).
  The worst case is one settlement's wages paid into a berth in the same block it changes hands. Our
  app always signs off before the hand-over, in one approval. See `docs/THREAT_MODEL.md` T7.
