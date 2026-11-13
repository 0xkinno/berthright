# Sponsor intelligence: House of Stake Top Level Accounts

Source: https://github.com/houseofstake/tla-contracts at commit
`d85860a8cc2bfcb8b617b28cab558da5d39333fc` (2026-10-15; the repository has no release tags). Licence
`MIT OR Apache-2.0`. Every line below was checked against that commit. Line numbers refer to it.

## Roles

| Contract | Role | Berthright use |
|---|---|---|
| `hos-wallet` | The wallet every leased name runs, published once as a global contract | every berth |
| `wallet-impl-deployer` | Publishes the wallet code after council approval | testnet fleet |
| `registrar` | Creates names under a namespace and initialises the wallet | `crew.<root>` namespace |
| `tla-registry` | Lease ledger and NEP-171 collection | `nft_token`, `nft_transfer` |
| `hos-extension` | Carries out rotations for the registry | transfers |
| `mpc-recovery` | Recovery quorum and timelock | deployed, not used by us |

## The wallet surface we call (`contracts/hos-wallet/src/lib.rs`)

| Method | Line | Who | Notes |
|---|---|---|---|
| `w_execute_extension(request)` | 251 | an enabled extension | needs a non-zero deposit; the owner is an extension; external promises are detached (we cannot observe their result) |
| `hos_grant_spend(extension, receivers, budget_yocto, tokens, items, expires_at)` | 389 | owner, 1 yocto | grantee must already be an extension and not the owner or authority; re-granting raises ceilings, keeps spent |
| `hos_revoke_spend(extension)` | 428 | owner, 1 yocto | resets the meter |
| `hos_agent_status(extension)` | 439 | view | grant, state, freeze, reserve |
| `nft_item_info()` | 496 | view | spec `sharded-item-1.0.0`, status, collection, owner, `rotation_seq`, `rotation_epoch` |
| `hos_payout_account()` | 516 | view | where sweeps go; **not always the holder** (see FRICTION.md) |
| `hos_freeze()` / `hos_unfreeze()` | 821 / 854 | owner or authority, 1 yocto | self-freeze is undone only by the owner |
| `apply_rotation` | 752 | internal | clears grants (786), bumps `rotation_seq` (794), keeps only the authority as extension (795), sweeps native NEAR to the outgoing payout account (791, 815) |
| `charge_ft_transfer` | 1293 | internal | receiver must be granted (`RECEIVER_NOT_GRANTED`), token must be granted (`TOKEN_NOT_GRANTED`), spent + amount <= budget (`TOKEN_CAP_EXCEEDED`) |
| `charge_token_call` | 1274 | internal | exactly 1 yocto; only `ft_transfer` and `nft_transfer` |

## Rotation causes (`crates/hos-common/src/lib.rs`)

| Cause | Sweeps | Repoints payout | Needs holder | Needs expiry |
|---|---|---|---|---|
| Sale, Transfer | yes | yes | yes | no |
| Deposit | yes | no | yes | no |
| ReRent, Reclaim | yes | ReRent no, Reclaim yes | no | yes |
| Recovery | no | yes | no | no |
| Revert | no | yes | no | no |

## Registry facts that shaped the design (`contracts/tla-registry/src`)

- `nft_transfer` (`nft.rs:127`) is called by the owner with 1 yocto and routes through `hos-extension`.
  Before dispatching it queries every token on the registry's FT allowlist and **refuses the
  transfer if the name holds any of them** (`nft.rs:161`, `asset_gate.rs`). Tokens not on the
  allowlist pass to the buyer.
- A licensee-governed business namespace makes names non-resellable (`marketplace.rs:334`,
  `BusinessSubNotResellable`) and pins a paid mint's payout account to the licensee
  (`rental.rs`, `assert_accepting(&tla_id, &payout_account)`).
- A payment authority bound to a namespace can mint a name for any owner with any payout account
  (`rental.rs:192`, `rent_sub_account_paid`). This is how our crew welfare trust issues berths.

## The sharded-item draft (`docs/sharded-nft-items.md`)

An item answers `nft_item_info`; consumers pair it with the collection's `nft_token` and refuse unless
they agree. On-chain consumers must not treat a cross-contract read as current. Off-chain consumers
pin both reads to one block. Berthright does both: `sign_on` uses a joint promise, `settle`
re-reads every time, and the app pins both views to one block hash.

## Founder thesis (quoted with links, here only)

- NEAR HACKATHON brief: "The era of programmable money starts here." https://nearhackathon.com
- House of Stake, "Introducing Top Level Accounts and Recovery Keys on NEAR" (NEAR, 21 Sep 2026):
  a readable name that is a working account; names can be transferred and the previous owner's
  prepared approvals stop working at hand-over.

## Versions used

| Piece | Version | Where |
|---|---|---|
| near-sdk | =5.29.0 (matches HoS) | `Cargo.toml` |
| Rust | 1.97.1 (matches HoS `rust-toolchain.toml`) | `rust-toolchain.toml` |
| cargo-near | 0.23.0 (build), reproducible image `sourcescan/cargo-near:0.22.0-rust-1.97.1` | per-crate metadata |
| near-workspaces | =0.22.1 (matches HoS) | sandbox tests |
