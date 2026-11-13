# Submission payload (draft; Kinnoski confirms every field before anything is sent)

| Field | Value |
|---|---|
| projectName | Berthright |
| leadName | Kinnoski (Kinnoski to confirm the name to use) |
| email | Kinnoski to provide |
| size | 1 |
| tracks | nfts, realworld, open |
| nearAddress | Kinnoski's mainnet payout account (Kinnoski creates it; never invented) |
| projectUrl | https://github.com/0xkinno/berthright |
| demoUrl | the X post Kinnoski publishes |
| consent | true, only after Kinnoski agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

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
