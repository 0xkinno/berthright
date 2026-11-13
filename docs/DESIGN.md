# Design: Chartroom

Berthright is a wage guarantee for people who work at sea, so the interface borrows from the two rooms on a ship where money and position are kept honest: the chartroom and the night watch.

## Grounds

| Ground | Use | Pattern |
|---|---|---|
| Chart paper `#e8eeec` | every content page | a plotting sheet: 32 px minor grid, 160 px meridians, and three depth contours, fixed so content slides over the chart |
| Night watch `#06121a` | hero, nav, footer, closing band | a 120 px grid with a cross at each intersection, a masthead-lamp glow at the top and a faint starboard-green glow low right |

## Plates

Panels are plates, not cards: a crisp sheet `#fbfdfc`, a 1 px hairline, 8 px radius, and four brass registration ticks (`#a9874a`) set 7 px inside each corner, the marks a chart printer uses to line up a sheet. The same ticks frame each "How it works" scene.

## Type

- Display: Fraunces at optical size 144, weight 480, tight tracking. Headlines read like the title block on an Admiralty chart.
- Text: Instrument Sans.
- Labels and numbers: IBM Plex Mono, uppercase with wide tracking for corner labels, tabular for money.

## Colour

| Token | Hex | Job |
|---|---|---|
| `--ink` | `#0b1d29` | text on chart paper |
| `--flare` | `#c53f17` | the one action colour; buttons, refusal bullets, the active bar |
| `--lemon` | `#f5b041` | masthead lamp: lit portholes, the highlighted words on night |
| `--signal` / `--signal-bright` | `#0f7a5c` / `#3fbf9b` | paid, covered, observed |
| `--mayday` | `#b23a14` | refusals and arrears |
| `--brass` / `--brass-soft` | `#6e531c` / `#c9a865` | eyebrows, numerals, corner ticks |
| `--mist` | `#a9bcc6` | secondary text on night (AA) |

## The hero: a deck of plates

Seven plates, all drawn in SVG, scatter round the headline: the berth (a porthole with the NFT name and a full reserve bar), the MV Kestrel at anchor, the daily wage ledger, the sea-service record with a signed-off stamp, the verify run, the allotment arcing home to Kochi, and the flare. They fly in on springs, drift with the pointer by depth, can be dragged and swing back, and each opens the page it depicts. Corner labels carry the anchorage position and a live ship's clock (UTC+4). On phones three plates fan above the headline.

## Motion

Springs for entry; a pointer parallax on the deck; scroll reveals; stacked sticky step plates; links whose underline is ruled in from the left like a course line. Every motion is skipped under `prefers-reduced-motion`.

## Checked

`e2e/layout.mjs`: 9 routes on 8 devices, 72 of 72 views with no horizontal scroll, no headline collisions, tap targets of at least 44 px, axe WCAG 2.2 AA clean and no console errors.
