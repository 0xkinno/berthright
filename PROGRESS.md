# Progress

Updated at the end of every phase. Ticks mean done and verified.

## 13 Nov 2026

**Phase 0 Ground**
- [x] Repo, `.gitignore` (reference/, .env*, target/, node_modules/), identity 0xkinno, commit-msg and pre-commit hooks, `core.hooksPath`
- [x] `.claude/settings.json` with empty attribution; `.github/workflows/no-claude-attribution.yml`
- [x] `reference/` populated (HoS repo, rules, instruction, lane map, private word list); `docs/.wordlist.sha256`; `scripts/check-names.ts`
- [x] `RULES_EXTRACT.md`, `SPONSOR_INTEL.md`, `docs/MOMENT.md` (every link opened, figures quoted), `docs/THESIS.md`, `docs/RISK.md`, `docs/THREAT_MODEL.md`
- [x] LICENSE (MIT), SECURITY.md
- [ ] `npx skills add near/agent-skills` (interactive installer; the official docs were read directly instead)
- [ ] Vercel deployment at the final URL (needs Kinnoski's Vercel project)

**Phase 1 The berth exists**
- [x] Testnet root `berthright.testnet` created through the faucet service (10 NEAR)
- [x] HoS `tla-contracts` pinned at `d85860a`; built; wasm hashes in `fleet/hos-wasm.sha256`
- [x] Fleet deploy script mirroring HoS `testnet_deploy.rs` (`fleet/deploy-testnet.ts`), idempotent
- [ ] Fleet on testnet (needs about 70 more testnet NEAR on the root)
- [x] In the sandbox: berths issued, `nft_item_info` and `nft_token` agree, owner drives the berth, AddKey refused

**Phase 2 Transfer detail**
- [x] Sandbox tests: NEAR swept to seller, tokens stay and pass, grants wiped, failed sweep leaves NEAR, allowlisted token blocks the transfer
- [x] `docs/FINDINGS.md`, `docs/FRICTION.md`

**Phase 3 and 4 Contracts**
- [x] `tusd` with capped faucet; `portage` with every method, refusal code and event; `allotment`
- [x] All named unit tests; property tests at 10,000 cases; sandbox tests with the real fleet, including the full voyage
- [ ] Deployed, sealed, code hashes recorded (waiting on testnet NEAR)

**Phase 5 Proof harness**
- [x] `scripts/census.ts`, `data/cases.csv` (245 cases, source URL and date per row); replay report
- [x] `scripts/crank.ts`, `crank.yml`; `scripts/verify.ts` with `--tamper`; `live.yml`; `scripts/facts.ts` with `--check` in CI; fault switch
- [ ] Break campaign on testnet, cost per wage day, one unattended crank run, on-chain replay of one real case (after deployment)

**Phase 6 and 7 App and design**
- [x] All routes built (`next build` green); RPC failover; block-pinned berth reads; near-connect; browser signer; judge API with caps and kill switch; NEP-366 relayer; NEP-413 gated notices; portage bill CSV and PDF; live Intents quotes
- [x] Design system: tokens, self-hosted Zodiak, General Sans, Geist Mono; mark and favicon; hero ship with lights on board; glow cards; capsule nav with power-icon disconnect
- [x] Layout and axe suite (`e2e/layout.mjs`): 9 routes on 8 viewports, 72 of 72 page views clean (no horizontal scroll, no overlap, tap targets of at least 44 px, axe WCAG 2.2 AA, zero console errors)
- [x] Guided tour on `/judge` (7 steps, spotlight, timeline, keyboard, `?tour=1&render=1`)
- [ ] Playwright money-path flows on testnet and one manual pass with a real wallet (after deployment)

## Self-judge (1 to 5, with evidence)

Scored after deployment.

## 13 Nov 2026, late afternoon

Done:
- Chartroom redesign (own theme, distinct from the reference site): plotting-sheet ground, night-watch hero deck of drawn plates, brass registration ticks; 80 of 80 page views clean.
- `/berths`: the berth register, every berth NFT read from the House of Stake registry and drawn from chain state.
- `/proof` runs its checks in parallel and fills in live (2.5 s, was a long spinner).
- One real ITF case (SELIN, IMO 9033220) run end to end on testnet; owed wages covered.
- Red team round 1 (`REDTEAM_LOG.md`): judge setup failure found and fixed; voyage 8 of 8 again on the live app.
- `TASK.md` committed with every tick backed by evidence.

Waiting on Kinnoski: crank secrets, one manual wallet pass, agent skills install, video, X post, form.
