# Proof plan

Every number lands in `docs/FACTS.json` (written by `scripts/facts.ts`, checked in CI).

1. **External ground truth.** `scripts/census.ts` collects real abandonment cases from the ITF's
   public abandonment list into `data/cases.csv`, each row with source URL and retrieval date. The
   joint IMO/ILO database refused scripted access (HTTP 403), so the ITF list is the scripted set
   (labelled `wild`). Done: 245 cases.
2. **Counterfactual replay.** `scripts/replay.ts`: without Berthright, 0 months on board on day one;
   with it, `min(months_owed, 4)` per crew member. Reports cases replayed, excluded (counted), fully
   covered, partial misses (named by vessel and IMO), and the share of owed crew-months on board.
   Over-release is impossible by construction (test `release_never_pays_more_than_is_owed`). Done.
3. **On-chain replay of one real case.** A fast-clock ship with the case's crew count and months
   unpaid, every transaction linked, labelled "replay of public case data". After deployment.
4. **Break campaign.** `scripts/seed-demo.ts` records each refusal as a real testnet transaction
   with its decoded error in `data/runs.json`; shown on `/break`. After deployment.
5. **Misbehaving model.** The contract reader gets a photo with injected text and a doctored second
   contract. Expected: only schema fields survive, REVIEW states, and sign-on still needs the
   crew member's confirmed wage. Needs a NEAR AI key.
6. **Fault switch.** `BERTHRIGHT_FAULT=stale_rpc|ai_down|quote_down` makes `/api/status`,
   `/api/sea` and `/api/quote` report the failure in plain words.
7. **Unattended run.** `.github/workflows/crank.yml` every 10 minutes; one run nobody started is
   recorded in `docs/EVIDENCE.md`.
8. **Cost per unit.** Gas burnt by `settle`, `allotment.run` and `release_guarantee` at the testnet gas
   price, converted at a dated NEAR price from 1Click's token list.
9. **Theme metric.** Wage payments, allotments and releases executed with no human action, versus
   decisions asked of the crew member.
10. **Mainnet rung (asks Kinnoski first).** Read a real leased name's `nft_item_info` and registry
    `nft_token` pinned to one block on `/proof`; live 1Click quotes (done, no funds needed).

`scripts/verify.ts` (no keys) checks zero access keys and code hashes, rebuilds every ship from
events and compares with views; `--tamper` must fail.
