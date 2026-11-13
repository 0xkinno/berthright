# Security

Berthright is a hackathon build running on NEAR testnet. Test dollars (`tUSD`) have no value.

## Reporting

Open a private security advisory on this repository, or message @0xkinno on X. Please include the
contract account, the method, and a transaction hash if you have one. We reply within 48 hours
during the judging window (16 to 18 Nov 2026).

## Scope

- `contracts/portage` (the wage chest), `contracts/allotment`, `contracts/tusd`
- The relayer and judge routes under `app/app/api`

House of Stake contracts are deployed unmodified from a pinned commit. Report issues in them to
House of Stake, not here. We record what we learned about them in `docs/FRICTION.md`.

## What we already guard against

See `docs/THREAT_MODEL.md` for every way money at hand-over could be kept or diverted, and what
stops each one.
