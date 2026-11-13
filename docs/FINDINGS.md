# Findings: what moves when a berth changes hands

A berth is a House of Stake leased name. When its NFT is transferred, the name's wallet runs
`apply_rotation` (`contracts/hos-wallet/src/lib.rs:752` at HoS commit `d85860a`). We read the code,
then proved each point in a local sandbox against the real HoS wasm, built unmodified from that
commit. Reproduce:

```bash
fleet/build-hos.sh
```

```bash
cargo test -p portage --test tla_transfer -- --nocapture --test-threads 1
```

(In a container that forbids raising the open-file limit, prefix with
`LD_PRELOAD=fleet/shim/libfdlimit.so`; see `fleet/shim/fdlimit.c`.)

## 1. Native NEAR goes to the seller's payout account

`apply_rotation` reads the outgoing `payout_account` before repointing it (line 791) and calls
`sweep_to(outgoing)` (line 815), which sends everything above the storage reserve.

Sandbox (`tla_transfer_sweeps_native_near_to_the_seller_but_leaves_tokens`): we sent 5 NEAR to
`ab2-sweep.crew.test.near`, then Arjun transferred the NFT to the relief.

```
berth NEAR before 5200022346517347000000000 after 8537644919803100000001
EVENT_JSON:{"standard":"hos_tla_tenant_wallet","version":"1.0.0","event":"swept_near",
  "data":{"payout_account":"arjun.test.near","amount":"5191552346517347000000000"}}
```

The sweep also took the 0.2 NEAR creation deposit the issuer paid when it minted the name. Only the
storage reserve (about 0.0085 NEAR) stayed.

## 2. NEP-141 tokens stay in the account and pass to the buyer

Nothing in `apply_rotation` touches token balances (`hos_sweep_ft`, line 895, is authority-only and
only after the lease expires). Same test: 100 tUSD sat in the berth before and after the transfer;
the relief now controls them.

**Unless the registry allowlists the token.** `nft_transfer` (`contracts/tla-registry/src/nft.rs:127`)
first queries every token on the registry's FT allowlist and refuses the transfer if the name holds
any of them (`asset_gate.rs`, `SubAccountHoldsTokens`). Test
`an_allowlisted_token_blocks_the_transfer_until_the_berth_is_empty`: with tUSD allowlisted, the
transfer was refused while the berth held 10 tUSD, and went through once the holder emptied it with
`w_execute_extension`.

## 3. Grants and extensions are wiped

`apply_rotation` clears every spend grant (line 786) and keeps only the HoS authority as an extension
before inserting the new owner (line 795). Test `tla_transfer_wipes_the_allotment_grant`: after the
transfer, `hos_spend_grant(allotment)` is null and `w_extensions` holds the authority and the relief
only.

## 4. A failed sweep leaves the NEAR for the new owner

The sweep is a detached promise; its resolver emits `SweepFailed` on failure (line 917). Test
`a_failed_sweep_leaves_the_near_for_the_new_owner`, with a payout account that does not exist:

```
EVENT_JSON:{"standard":"hos_tla_tenant_wallet","version":"1.0.0","event":"sweep_failed",
  "data":{"payout_account":"ghost.test.near","ft":null,"amount":"3191552346517347000000000"}}
```

The 3.19 NEAR stayed in the berth, now held by the relief.

## 5. Every hand-over bumps `rotation_seq`

`rotation_seq` went from 0 to 1 on the transfer (line 794). This is what Berthright watches.

## What Berthright does with this

- Wages are paid in a token, never as native NEAR, so the sweep cannot take them.
- Because tokens pass to the buyer, the app signs off first (final wages to the seller's own account)
  and moves anything left in the berth to the seller in the same approval as the transfer.
- The chest re-reads `rotation_seq` on every settlement and pays the account that signed on if it
  changed (`an_unannounced_hand_over_on_chain_pays_arjun_not_the_relief`).
- The allotment re-reads `rotation_seq` too, on top of the wallet wiping its grant
  (`allotment_stops_after_hand_over`).
