# TASK.md

Berthright build tasks, in dependency order. Tick `[x]` only when the task is done **and verified**
(test green, transaction link recorded, or screenshot saved). Each phase ends with: tests green,
`scripts/check-copy.ts` clean, `scripts/check-names.ts` clean, PROGRESS.md updated, claims vs code diff
done, commit authored by 0xkinno.

## Phase 0. Ground
- [x] Public repo `0xkinno/berthright`; `.gitignore` includes `reference/`, `.env*`, `target/`, `node_modules/`
- [x] `git config user.name 0xkinno`, noreply email set; `.githooks/commit-msg` and `.githooks/pre-commit` installed; `core.hooksPath` set
- [x] `.claude/settings.json` with empty attribution committed
- [x] `.github/workflows/no-claude-attribution.yml` committed and green
- [x] `reference/` populated (sponsor repos, sample repos, V5, instruction file, private lane notes, private word list)
- [x] `docs/.wordlist.sha256` generated; `scripts/check-names.ts` in CI
- [ ] `npx skills add near/agent-skills` done (blocked in this session by the permission classifier; Kinnoski runs it locally; docs llms.txt files were read instead)
- [x] `RULES_EXTRACT.md` (verbatim from the live site and HACKATHON.md, form fields, deadline 15 Nov 00:59 WAT)
- [x] `SPONSOR_INTEL.md` (TLA system, grant semantics, sharded-item draft, versions, availability)
- [x] `docs/MOMENT.md` with the What is true / Source table, every link opened and dated
- [x] `docs/THESIS.md` (five-line pitch, hook, X without Y, primary guarantee, human loop, name rationale)
- [x] `docs/RISK.md` (parameters stricter than MLC, maximum loss, rounding, issuer powers)
- [x] `docs/THREAT_MODEL.md` written before contract code (every way to keep or divert money at hand-over)
- [x] Empty Next.js app deployed on Vercel at its final URL; `scripts/reachability.ts` passes (berthright-app.vercel.app)
- [x] LICENSE (MIT), SECURITY.md

## Phase 1. The berth exists (House of Stake fleet on testnet)
- [x] Testnet root account funded (~60 NEAR) via faucet-sponsored accounts; credentials only in `~/.near-credentials` (funded by Kinnoski in several faucet top-ups; keys in ~/.near-credentials and .env.local, never committed)
- [x] HoS `tla-contracts` cloned at a pinned release; commit hash recorded in SDK_SURFACE.md
- [x] HoS contracts built (`cargo near build non-reproducible-wasm --locked --no-abi`), wasm hashes recorded
- [x] Fleet deployed to testnet following `integration/tests/testnet_deploy.rs`; account ids in `deployments/testnet.json`
- [x] Crew namespace registrar created (`crew.<root>.testnet`); welfare trust account set as issuer
- [x] Three berths issued (`create_sub_account`); `nft_item_info` and `nft_token` agree for each (11 berths issued via rent_sub_account_paid; /proof berth_agree check; /berths register)
- [x] Probe script: owner `w_execute_extension` transfer works; `AddKey` on a berth refused (tx links) (break add_key tx; judge voyage tx 16)
- [x] `docs/PLATFORM_PROBE.md` written from real calls
- [ ] If the fleet cannot be stood up: stop and ask Kinnoski before using a labelled substitute (not needed: fleet stood up)

## Phase 2. Reproduce the transfer detail
- [x] Sandbox test: transfer sweeps native NEAR to the seller's payout account
- [x] Sandbox test: NEP-141 balance stays with the berth and passes to the buyer
- [x] Sandbox test: transfer wipes grants and extensions
- [x] Sandbox test: a failed sweep leaves NEAR for the new owner (`SweepFailed`)
- [x] `docs/FINDINGS.md` and `docs/FRICTION.md` with commands, outputs and file:line

## Phase 3. The wage chest (`portage`) and test dollars (`tusd`)
- [x] `tusd` NEP-141/145/148 with capped faucet; deployed
- [x] `portage` state and all methods per the instruction Part 8.2
- [x] Stable `E_*` refusal codes; events per Part 8.2
- [x] Unit tests (all names in Part 8.5) green
- [x] Proptests: exact accrual with carry; money conservation (10,000 cases each)
- [x] Sandbox tests with the real HoS fleet: sign-on gate, wage mismatch, non-holder, unannounced hand-over, frozen berth
- [x] `full_voyage_sign_on_wages_allotment_abandonment_release` sandbox test green
- [x] Reproducible build; deployed to testnet; deployer key deleted; code hash recorded (/proof portage_keys and portage_hash pass)
- [x] Demo ship "MV Kestrel (fictional)" on a fast clock with 6 berths, funded

## Phase 4. The allotment
- [x] `allotment` contract per Part 8.3, request JSON matching the HoS capabilities test
- [x] Sandbox: pays only the granted receiver, up to budget; stops after hand-over; over-budget refused
- [x] Deployed; key deleted; NEAR float funded; code hash recorded (/proof allotment_keys and allotment_hash pass)

## Phase 5. Proof harness
- [x] `scripts/crank.ts` (settle, run, declare, release) and `.github/workflows/crank.yml` every 10 min
- [ ] One unattended crank run recorded (workflow URL + tx links) in EVIDENCE.md (waiting on Kinnoski adding CRANK_* repository secrets; local unattended crank run recorded)
- [x] `scripts/census.ts` + `data/cases.csv` (source URL and retrieval date per row; curated vs wild labelled)
- [x] Replay report: covered, partial misses named by vessel, excluded counted, share of owed wages on board
- [x] One real case replayed on a fast-clock ship on testnet, every tx linked (SELIN, IMO 9033220, scripts/replay-case.ts, data/runs.json case_replay)
- [x] Break campaign: each refusal as a real testnet tx with decoded error (9 items) (10 refusals)
- [x] Cost per wage day measured with dated NEAR price
- [x] Fault switch `BERTHRIGHT_FAULT` documented and demonstrated
- [x] `scripts/facts.ts` writes `docs/FACTS.json`; CI fails on drift
- [x] `scripts/verify.ts` passes from a clean clone with no keys; `--tamper` fails (18 of 18 from 193 transactions, clean clone 13 Nov)
- [x] `.github/workflows/live.yml`: zero access keys and code hashes every 6 h

## Phase 6. App core
- [x] `lib/near.ts` (RPC failover, views, near-connect, tx helpers); `lib/berth.ts` (pinned-block reads)
- [x] Browser signer for `/judge` and Playwright; `/api/judge` with caps and kill switch
- [x] NEP-366 relayer with receiver and method allowlist
- [x] `/crew`: sign on (wage confirm), berth card, allotment setup (one approval batch), freeze, sign off + hand-over batch
- [x] `/ship/[id]`: coverage meter, top up, portage bill CSV + PDF, arrears banner
- [x] `/berth/[account]`: history (sea-service record), explorer links, NEP-413 gated crew notices
- [x] `/family/[account]`: allotments received, live 1Click quote (labelled)
- [x] `/judge`: 4-minute walk, checklist ticks itself from chain, failure buttons
- [x] `/proof` + `/proof.json`; `/break`; `/findings`
- [x] `/api/status` measured probes; `/api/stats` from chain
- [ ] Playwright: every money path end to end on testnet (sign on, wages, allotment, abandonment, release, hand-over, disconnect) (e2e/judge.mjs covers sign on, wages, allotment, abandonment, release; hand-over is recorded by scripts/seed-demo.ts, not Playwright; disconnect needs a real wallet)

## Phase 7. Design pass
- [x] `docs/DESIGN.md` (mark, wordmark, tokens, fonts, signature motion, ornaments)
- [x] Fonts self-hosted via next/font (changed to Fraunces, Instrument Sans, IBM Plex Mono with the Chartroom redesign at Kinnoski's request); no Inter anywhere
- [x] Logo mark SVG and favicon
- [x] Hero ship SVG with lit portholes; section SVGs (plate, portage page, tide gauge, fenced envelope, flare)
- [x] Capsule nav with Connect, account chip and power-icon disconnect; mobile sheet
- [x] Glow cards with cursor light; reduced-motion respected
- [x] Landing sections Nº 01 to Nº 06 + footer
- [x] Guided tour (7 steps, timeline, keyboard, render mode)
- [x] Playwright layout checks on 8 viewports: no overlap, no horizontal scroll, tap targets >= 44 px
- [x] axe WCAG 2.2 AA clean; zero console errors; screenshots saved for README
- [ ] Manual pass with one real wallet recorded in PROGRESS.md (Kinnoski, with his own testnet wallet)

## Phase 8. Sponsor depth on mainnet (ask Kinnoski first)
- [x] Live 1Click quotes (dry) for allotment cash-out and owner top-up (/api/quote, /family)
- [x] NEAR AI Cloud SEA reader: strict schema, signature verified, OBSERVED / REVIEW / NOT OBSERVED
- [x] Misbehaving-model tests: injected text, doctored second contract (PASS and FAIL runs recorded) (e2e/sea, EVIDENCE.md)
- [x] Real HoS leased name on mainnet read live on `/proof` (pinned block)
- [ ] Optional, approved: one capped real remittance via Intents, tx linked (not approved; Kinnoski holds no mainnet NEAR)

## Phase 9. Stretch (only if 0 to 8 are green)
- [ ] Welfare trust as a Sputnik DAO owning the crew namespace (then add the `social` track) (stretch, not started)
- [ ] Late top-up alert on Telegram using the same API (stretch, not started)
- [ ] MCP tool `berth_status` (stretch, not started)

## Phase 10. Judge-agent red team
- [x] Five roles on the deployed URL (rubric, ten-minute, sponsor maintainer, verifier, skeptic) (REDTEAM_LOG.md round 1)
- [ ] Defects fixed and redeployed; repeat until a clean round; `REDTEAM_LOG.md` updated

## Phase 11. Present and submit
- [x] README per instruction Part 14 (story mode, numbers from FACTS, screenshots from the deployed app)
- [ ] EVIDENCE.md, PROOF.md, JUDGE.md, MILESTONES.md, PROGRESS.md current
- [ ] Video recorded (2:30 to 3:30), fast clock and fictional people labelled
- [ ] X post text approved by Kinnoski and published by Kinnoski
- [ ] `SUBMISSION_NEARHACKATHON.md` payload shown to Kinnoski and approved
- [ ] Form submitted by Kinnoski before 15 Nov 00:59 WAT
- [ ] Tag `hackathon-submission`; deployment frozen through 18 Nov
