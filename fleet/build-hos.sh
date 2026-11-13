#!/usr/bin/env bash
# Builds the House of Stake TLA contracts from a pinned commit, unmodified, and stages the wasm
# in fleet/wasm for the sandbox tests and the testnet deploy. We never edit their code.
set -euo pipefail
HOS_REPO="https://github.com/houseofstake/tla-contracts"
HOS_COMMIT="d85860a8cc2bfcb8b617b28cab558da5d39333fc"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${HOS_SRC:-$HERE/.tla-contracts}"
if [ ! -d "$SRC/.git" ]; then git clone "$HOS_REPO" "$SRC"; fi
git -C "$SRC" fetch --depth 1 origin "$HOS_COMMIT" 2>/dev/null || true
git -C "$SRC" checkout -q "$HOS_COMMIT"
test "$(git -C "$SRC" rev-parse HEAD)" = "$HOS_COMMIT"
for c in hos-wallet wallet-impl-deployer registrar tla-registry hos-extension mpc-recovery; do
  (cd "$SRC/contracts/$c" && cargo near build non-reproducible-wasm --locked --no-abi)
done
mkdir -p "$HERE/wasm"
for n in hos_wallet wallet_impl_deployer registrar tla_registry hos_extension mpc_recovery; do
  cp "$SRC/target/near/$n/$n.wasm" "$HERE/wasm/"
done
(cd "$HERE/wasm" && sha256sum *.wasm | tee "$HERE/hos-wasm.sha256")
