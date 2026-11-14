# Submission payload (Kinnoski confirms every field, then submits the form himself)

Form: https://nearhackathon.com/#apply · deadline 14 Nov 2026, 23:59 UTC (15 Nov, 00:59 WAT)

| Field | Value |
|---|---|
| projectName | Berthright |
| leadName | Kinnoski |
| email | provided by Kinnoski in the form (kept out of this public repo) |
| size | 1 |
| tracks | nfts, realworld, open |
| nearAddress | kinnoski.near |
| projectUrl | https://github.com/0xkinno/berthright |
| demoUrl | https://x.com/0xkiddok/status/2121550428831621201 |
| idea | the text below (1,738 characters) |
| website | leave empty (spam-trap field; must not be sent) |
| consent | true: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

Before submitting: the repo is public, the X post is live with the video, and the README names the other
project (Keytell) in Disclosures.

## idea (under 2,000 characters)

Seafarers are abandoned when shipowners stop paying: in 2025, 6,223 seafarers on 410 ships, owed
US$25.8M (ITF). The law's answer is insurance: up to four months of wages, after a claim, which one
insurer took eight months to pay.

Berthright puts the four months on board before anyone signs on. Each berth on a ship is a House of
Stake Top Level Account: a NEAR account that is also an NFT, running House of Stake's audited
keyless wallet. The shipowner must lock four months of the berth's wages plus the fare home in our
wage chest contract, or sign-on is refused. Wages accrue by the second and anyone can settle them
into the berth. The allotment home pays itself through the berth's own spend grant (one receiver, a
budget, an expiry), enforced by House of Stake's wallet. If the owner stops paying, after a 14-day
grace anyone can declare abandonment and release each crew member's guarantee to their own account.
At crew change the berth NFT moves to the relief; the old holder's grant is wiped and the chest
detects any unannounced hand-over through rotation_seq.

Replayed against 138 real 2023 to 2025 cases from the ITF abandonment list, 57.8% of owed
crew-months would have been on board on day one, against 0% today; 84 partial misses are named.
Contracts are keyless, tested with property tests and in a sandbox against House of Stake's real
wasm, and we document what actually moves when a leased name changes hands. Judges can run the
whole voyage on testnet in four minutes without a wallet at /judge. The same chest also ran on
mainnet in real USDC: funded from Base through NEAR Intents, paying a real House of Stake berth,
berthright.seafarer, and releasing the guarantee to the crew member; /proof rechecks it live.
