# Proof

Three ways to check Berthright without trusting us.

1. **In the browser:** `/proof` runs every check against public NEAR RPC: zero access keys on
   `portage` and `allotment`, code hashes against the recorded build, the berth's `nft_item_info`
   and the registry's `nft_token` pinned to one block, the demo ship's books, every signed berth's
   reserve. JSON twin: `/proof.json`.
2. **From a clean clone, no keys:** `npx tsx scripts/verify.ts` lists every transaction to the
   chest, rebuilds every ship from `berthright` events alone, compares with the contract's views,
   and ends with `N of N checks pass, from M transactions`. `--tamper` changes one event amount and
   must fail.
3. **On a schedule:** `.github/workflows/live.yml` runs the same verify every six hours.

## Reproducible build

Contract code hashes are recorded at deploy in `deployments/testnet.json`. Each crate pins the
reproducible image `sourcescan/cargo-near:0.22.0-rust-1.97.1` (the same image House of Stake pins).
`cargo near build reproducible-wasm` in `contracts/portage` rebuilds the exact wasm from the
committed source.
