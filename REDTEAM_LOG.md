# REDTEAM_LOG.md

Judge-agent red team per V5 G9, on the deployed URL https://berthright-app.vercel.app and the public
repo. Round 1, 13 Nov 2026. Each role used only the live app, the repo and the published rules.

## Round 1

| Role | What was tried | Result | Defect | Fix |
|---|---|---|---|---|
| Rubric judge | Mapped the five criteria (technical implementation, design, impact, originality, sustainability) to README sections and pages | Every criterion has a section and a page | Each property in the House of Stake table pointed to a test but not to code | Added file:line links for every property (README, "The berth is the account") |
| Ten-minute judge | Ran the full `/judge` voyage in a browser on the deployed app (`e2e/judge.mjs`) | **Failed at step 0** | The crew welfare trust held 0.31 NEAR after a case replay; a berth mint reserves about 0.4 NEAR; the server had already sent the three judge grants, so each failed run lost about 0.57 NEAR | `/api/judge` now checks the trust balance first and mints before granting; mint gas lowered to 200 Tgas from measured use; `/api/status` shows sponsor and trust balances against their floors; trust topped up. Rerun: **8 of 8, 22 transactions, 0 page errors** |
| Ten-minute judge | Opened `/proof` | Spinner with a disabled button for several seconds, then results | Thirteen checks ran one after another through a 3.5 s RPC | Checks run in parallel and fill in as they land; fastest RPCs first; 5 s timeout. All checks in 2.5 s |
| Sponsor maintainer | Checked every House of Stake claim against code and chain: joint `nft_item_info` + `nft_token` read, `rotation_seq` re-read on settle, grant fence, AddKey impossible, `only_registry` | Each backed by code, a sandbox test on HoS wasm and a testnet tx | NFT use was explained but there was no page showing the tokens themselves | Added `/berths`, a register of every berth NFT read from the registry (`nft_tokens`, `nft_total_supply`) and drawn from chain state |
| Verifier | Fresh clone, no keys: `npx tsx scripts/verify.ts` and `--tamper` | 18 of 18 checks from 193 transactions; `--tamper` fails | none | none |
| Skeptic | Looked for headline numbers without a script source, and for claims the app cannot show | All README numbers come from FACTS or runs.json | "Replayed real cases" was a model over the ITF list, with no case run on chain | Replayed SELIN (IMO 9033220) on testnet end to end, below |

## Real case on chain (added in this round)

SELIN, IMO 9033220, Sharjah, UAE: 2 seafarers, 3 months owed (ITF list, retrieved 2026-11-13).
Crew accounts are stand-ins and the wage is assumed (13 tUSD a day; the list publishes no wages). The owner
locked only the reserve and paid nothing. After 3 months of ship days unpaid (fast clock, 10 s a day),
abandonment was declared and both guarantees released.

| Step | Transaction |
|---|---|
| Berth minted to crew member 1 | [G1ndCVdUy9](https://testnet.nearblocks.io/txns/G1ndCVdUy9SN7tNHEWNAxysohWkxdArMd2ktsk7UhQKp) |
| Ship created | [9W1C9uQ6nw](https://testnet.nearblocks.io/txns/9W1C9uQ6nwR6XibjPL1eXXzkiJ4ZoNVJeQhA5pk27qSf) |
| Reserve only, no wages | [GkHD3yxiw5](https://testnet.nearblocks.io/txns/GkHD3yxiw5TXpMWuVXdH6Cw1etaV81MAZ8caiy2Ayo1m) |
| Sign-on | [78Hkrfhqpm](https://testnet.nearblocks.io/txns/78Hkrfhqpm1dowz7do5pkDKeGCBvAmcGnMGWuQcEPp2J) |
| Arrears recorded | [42iEA2xpy6](https://testnet.nearblocks.io/txns/42iEA2xpy6RoezCwX3hvGGPQKF4CM7N9BsV2YoBLiND4) |
| Abandonment declared | [AFLfqkAN6t](https://testnet.nearblocks.io/txns/AFLfqkAN6tZZgVtnTdsf14MaKVVoqzW8pMhGWbT3HLea) |
| Guarantee released (each) | [3g787VfmpZ](https://testnet.nearblocks.io/txns/3g787VfmpZDBLwDbh37x2i7yzZTE3p9ET1EipEhiwMfA), [Gm2mmGxsGp](https://testnet.nearblocks.io/txns/Gm2mmGxsGpQxyRbC4WUUiD6yseCCstMYP9tRWtCWeTr) |

Each crew member was owed 1,170 tUSD of wages and received 1,610 tUSD (1,560 of wages plus the 50 fare home).
The contract also records 1,950 tUSD as uncovered: the rest of the nine-month contract that abandonment ended,
beyond the four-month guarantee. Owed wages covered: **yes**.

## Open after round 1

- The unattended crank workflow waits on the `CRANK_*` repository secrets (Kinnoski).
- Playwright does not cover hand-over and disconnect; hand-over is recorded by `scripts/seed-demo.ts`.
- One manual pass with a real wallet (Kinnoski).
