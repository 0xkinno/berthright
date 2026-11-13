# Evidence

Every line here is a command output or a transaction link. Updated as runs happen.

## Contracts and tests (13 Nov 2026, local)

| Run | Result |
|---|---|
| `cargo test --profile proptest -p portage --lib` | 26 passed, 0 failed (includes two property tests at 10,000 cases each), 472 s |
| `cargo test -p allotment` | 1 passed (`request_matches_the_wallet_shape`) |
| `cargo test -p tusd` | 3 passed |
| `cargo test -p portage --test tla_transfer` (real HoS wasm, sandbox) | 5 passed |
| `cargo test -p portage --test allotment` (real HoS wasm, sandbox) | 2 passed |
| `cargo test -p portage --test voyage` (real HoS wasm, sandbox) | 4 passed, including `full_voyage_sign_on_wages_allotment_abandonment_release` |

Sandbox outputs quoted in [FINDINGS.md](FINDINGS.md).

## Real-case replay (13 Nov 2026)

`npx tsx scripts/census.ts` then `npx tsx scripts/replay.ts`:

```
wrote data/cases.csv: 245 cases from https://www.itfseafarers.org/en/directories/abandonment-list (retrieved 2026-11-13)
2023 to 2025: 138 cases replayed (7 excluded), 1632 seafarers.
On board on day one with Berthright: 57.8% of owed crew-months (without: 0%).
Fully covered: 54. Partial misses: 84, largest: FOURTHMAN (18 months, 18 crew); SATURINA (9 months, 35 crew); PRINCE 4 (12 months, 21 crew)
All listed years: 233 cases, 64.2% on board.
```

## Live quote (13 Nov 2026, mainnet, dry)

1Click `POST /v0/quote` with `dry: true`: 200 USDC on NEAR to USDC on Base quoted at
199.973007 USDC out, about 22 s.

## Testnet deployment

Pending funding of `berthright.testnet` (created via the faucet service, 10 NEAR; the House of
Stake wallet's global publish alone costs about 43 NEAR). When it runs, this section lists every
contract, code hash, the seal transactions and the break campaign from `data/runs.json`.

## Unattended crank run

Pending the testnet deployment and the `CRANK_*` GitHub secrets.
