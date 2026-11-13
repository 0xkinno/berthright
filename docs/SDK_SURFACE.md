# SDK surface: every NEAR piece Berthright calls

| Piece | Version | Where in this repo | Rung |
|---|---|---|---|
| House of Stake TLA contracts | commit `d85860a8cc2bfcb8b617b28cab558da5d39333fc`, deployed unmodified | `fleet/build-hos.sh`, `fleet/deploy-testnet.ts`, `fleet/hos-wasm.sha256` | testnet (our fleet) |
| `hos-wallet.nft_item_info` | sharded-item-1.0.0 | `contracts/portage/src/lib.rs` (`sign_on`, `on_settle_checked`), `contracts/allotment/src/lib.rs`, `app/lib/near.ts` (`pinnedBerth`) | testnet |
| `hos-wallet.w_execute_extension` | defuse-wallet `Request` JSON | `contracts/allotment/src/lib.rs` (`ft_transfer_request`), `app/lib/actions.ts` | testnet |
| `hos-wallet.hos_grant_spend` | | `app/lib/actions.ts` (`grantSpend`), sandbox tests | testnet |
| `hos-wallet.hos_freeze` / `hos_unfreeze` | | `app/lib/actions.ts`, `contracts/portage/tests/voyage.rs` | testnet |
| `tla-registry.nft_token`, `nft_transfer` | NEP-171 | `portage.sign_on`, `app/lib/actions.ts` (`handOver`) | testnet |
| `tla-registry.rent_sub_account_paid` | payment authority mint | `app/app/api/judge/route.ts`, `scripts/seed-demo.ts` | testnet |
| near-sdk (Rust) | =5.29.0 (same as HoS) | `Cargo.toml` | testnet |
| near-contract-standards | =5.29.0 | `contracts/tusd` | testnet |
| cargo-near | 0.23.0 build; reproducible image `sourcescan/cargo-near:0.22.0-rust-1.97.1` | per-crate `Cargo.toml` metadata | build |
| near-workspaces | =0.22.1 | `contracts/portage/tests` | sandbox |
| near-api-js | 7.5.3 | `scripts/lib/near.ts`, `app/lib/near.ts` | testnet + mainnet reads |
| @hot-labs/near-connect | 0.12.0 | `app/lib/near.ts` (`getConnector`, `walletSigner`) | testnet |
| NEP-141, NEP-145, NEP-148 | | `contracts/tusd` | testnet |
| NEP-297 events | standard `berthright` 1.0.0 | `contracts/portage/src/events.rs`, `contracts/allotment/src/lib.rs` | testnet |
| NEP-413 | | `app/lib/near.ts` (`sign413`), `app/app/api/notices/route.ts` | testnet |
| NEP-366 meta transactions | | `app/app/api/relay/route.ts` | testnet |
| NEAR Intents 1Click | `/v0/tokens`, `/v0/quote` with `dry: true` | `app/lib/intents.ts`, `app/app/api/quote/route.ts` | mainnet, quotes only |
| NEAR AI Cloud | `/v1/attestation/report`, `/v1/chat/completions`, `/v1/signature/{id}`; model `Qwen/Qwen3-VL-30B-A3B-Instruct` | `app/lib/nearai.ts`, `app/app/api/sea/route.ts` | mainnet API (needs key) |

## Grant semantics (verified in HoS source, `contracts/hos-wallet/src/lib.rs`)

- Only an extension the owner added can be granted (line 404); owner and authority cannot (401, 402).
- `receivers` bounds `receiver_id` inside `ft_transfer` args (1302) and plain transfer targets (1244).
- `tokens: [{token, budget}]` meters per token contract (1305 to 1315); `budget_yocto` meters NEAR.
- Only `ft_transfer` and `nft_transfer`, each with exactly 1 yocto (1281, 1286 to 1290).
- Re-granting raises ceilings and keeps what was spent (386 to 425); revoke resets (428).
- Every rotation clears grants (786) and every extension except the authority (795).

## The request JSON the allotment sends (checked by `request_matches_the_wallet_shape`)

```json
{"external":[{"receiver_id":"<tusd>","actions":[{"action":"function_call","payload":{
  "function_name":"ft_transfer","args":"<base64 of {receiver_id, amount, memo}>",
  "deposit":"1","gas":"15000000000000"}}]}]}
```
