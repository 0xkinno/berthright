# Rules extract

Verbatim facts from https://nearhackathon.com/HACKATHON.md, read on 13 Nov 2026. Read the live file
again before submitting.

## Dates (UTC)

| Fact | Value |
|---|---|
| Hackathon starts | 2026-11-01T00:00:00Z |
| Development ends (submission deadline) | **2026-11-14T23:59:00Z** (15 Nov 2026 00:59 WAT) |
| Judging starts | 2026-11-16T00:00:00Z |
| Results announced by | 2026-11-18T23:59:00Z |

## Start here (verbatim steps)

1. Build the project with the human.
2. Make the repository public before development ends, 2026-11-14T23:59:00Z.
3. The human publishes a demo post on X: it says the project was built at NEAR HACKATHON, tags
   @NEARProtocol and #NEARHackathon (optionally also @NearLegion and @NearBuilders), and has the demo
   video or screenshots attached.
4. Submit once: POST to https://nearhackathon.com/api/applications, only after the human has
   confirmed the exact payload.
5. Mistakes are fixed at https://nearhackathon.com/request-changes. Never submit twice.

## Submission fields (exactly these)

| Field | Rule |
|---|---|
| requestId | UUID, generated once, reused on retries |
| projectName | 2 to 80 characters |
| leadName | 2 to 80 characters |
| email | valid, max 160 characters |
| size | one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` |
| tracks | ids; we plan `nfts`, `realworld`, `open` |
| nearAddress | mainnet payout account the human creates |
| projectUrl | public repository URL, unique |
| demoUrl | public X post URL |
| idea | 20 to 2,000 characters |
| consent | true, after the human agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

`website` is a spam trap and must not be sent.

## Never without the human's explicit confirmation

Send the submission; post on X; make the repository public, push or force-push; sign transactions,
spend tokens or deploy to mainnet; commit secrets.

## Questions that shape this build

- Q-001: code from 2026-10-19 counts. This repository started on 2026-11-13.
- Q-005: libraries and AI-generated code are allowed and must be listed in the README.
- Q-007, Q-010: Intents has no testnet; testnet-only projects are eligible in every track.
- Q-012: a video is required; keep the hosted demo up through 2026-11-18.
- Q-014: add a LICENSE (MIT, done).
- Q-015: at most two projects per person; each README names the other.
- Q-017: Claude Code and Codex screen every project for reproducibility and README claims. Write
  "do X, see Y" steps.

## Judging words

"technical implementation, design, impact, originality and sustainability" (from the event brief;
used verbatim in the README criteria map).

## NFT track text (verbatim)

"Build NFTs as accounts: assets that own money, earn royalties, hold inventory, and carry
credentials, memberships or access rights." The track prompt asks to explain how control passes on
transfer and what stops the old owner keeping access, for a gated page for current holders, a
history view per NFT, transfer-path tests including a sale in the middle of a payout, and a written
threat model for the transfer.
