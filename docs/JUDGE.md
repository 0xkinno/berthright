# For judges

## Four minutes, no wallet

1. Open `/judge` and press **Start the 4-minute run**. See: three accounts created and a berth
   issued to your crew account, each with an explorer link.
2. Press **Do it** on each step in order. See the checklist on the right tick itself from chain
   reads (it re-reads every 6 seconds).
   - Step 3 shows a **refused** sign-on: `E_RESERVE_NOT_ON_BOARD`.
   - Step 4: signed on; 1,400 tUSD locked.
   - Step 5: wages in the berth account.
   - Step 6: the family receives an allotment through the berth's spend grant.
   - Step 7: early declaration refused with the seconds left.
   - Step 8: after about a minute of ship-time grace, declare, then release: the crew member's own
     account receives four months and the fare home.
3. Try the failure buttons: a stranger signs on, the owner takes the reserve, an allotment to a
   stranger. Each is refused on chain with a decoded reason.

## Without the browser

```bash
git clone https://github.com/0xkinno/berthright && cd berthright && npm ci
```

```bash
npx tsx scripts/verify.ts
```

```bash
npx tsx scripts/verify.ts --tamper
```

The first ends with `N of N checks pass`; the second must fail.

## Where to look

| Claim | Look at |
|---|---|
| The berth is a real House of Stake leased name | `/berth/<account>`: `nft_item_info` and `nft_token` pinned to one block |
| No reserve, no sign-on | `contracts/portage/src/lib.rs` `on_sign_on`; test `sign_on_is_refused_until_four_months_are_on_board` |
| Only the crew member can move what is in the berth | the berth has zero access keys (`/proof`); test `add_key_on_a_berth_is_impossible_and_house_of_stake_cannot_move_it_alone` |
| What moves at hand-over | `/findings`, `docs/FINDINGS.md` |
