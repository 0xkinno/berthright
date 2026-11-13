# Thesis

## Five-line pitch

```
NAME:      Berthright
MOMENT:    Arjun, an able seaman (fictional), at anchor off Khor Fakkan on day 74 with two months
           unpaid, in a year when abandoned seafarers were owed US$25.8M and one insurer took
           eight months to pay a valid claim.
ACTION:    Each berth is a NEAR Top Level Account. The shipowner must lock four months of wages
           before anyone signs on; wages flow into the berth daily; the allotment home pays itself
           through the berth's own spend grant; if the owner stops paying, the contract releases
           the guarantee to each crew member's own account.
DISCOVERY: everyone assumes wage protection is insurance you claim after the harm; in reality the
           wages can sit inside the berth from the first day, and the berth itself can be the
           seafarer's sea-service record.
PROOF:     replay of real abandonment cases: the share of owed wages that would already have been
           on board on the day of abandonment, with every case above four months named as a
           partial miss. (Numbers from docs/FACTS.json only.)
```

## Hook (spoken first)

Day 74 at anchor. Arjun hasn't been paid in two months. Last year six thousand seafarers were
abandoned like this. The insurance is supposed to pay, eventually. Berthright puts four months of his
wages inside his berth before he ever signs on. The berth is a NEAR account. His shipowner can fill
it. His shipowner cannot empty it.

## X without Y

**Four months of crew wages on board, without an insurance claim.**

## Primary guarantee

No crew member in a Berthright berth can be left with less than four months of wages and the fare
home, and nobody but that crew member can move what is already in the berth.

Where it is enforced: `contracts/portage/src/lib.rs` (`on_sign_on` locks the reserve before the
status becomes `Signed`; `release_guarantee` pays only the account that signed on), and the House of
Stake wallet (a berth has no access key; only its holder acts through `w_execute_extension`).

## The human loop

Software cannot do these, so the crew member does:

- Physically signs on and off, at the gangway, on a phone. Sign-on confirms the wage from their own
  Seafarer Employment Agreement (SEA).
- Reads their own contract. A model may propose numbers from a photo; the crew member confirms each.
- Chooses who receives the allotment and how much.
- Hands the berth over to the relief, in person.

Interruption budget: at most one decision a month after sign-on (the allotment). Always shown,
whatever the budget: abandonment declared, guarantee released, berth frozen, hand-over requested.

## Name

A berth is the bunk and the job that goes with it. "Berthright" is the right that comes with the
berth: the wages are already in it.
