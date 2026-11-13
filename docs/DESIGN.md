# Design

## Direction

Editorial, warm, cinematic. A shipping almanac crossed with a glossy magazine: ash paper, deep hull
ink, and one electric lemon-green accent per view that glows like a lit porthole at dusk. Not blue
and white. Not dark mode by default.

## Tokens (`app/app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#ECEBE4` | page background |
| `--paper-hi` | `#F7F6F0` | cards, raised surfaces |
| `--ink` | `#11140F` | text, dark panels |
| `--slate` | `#4F564B` | secondary text (AA on paper) |
| `--lemon` | `#D4F25C` | the one accent: CTAs, lit portholes |
| `--lemon-glow` | `rgba(212,242,92,0.55)` | halos, cursor light |
| `--signal` | `#00805F` | paid, observed, safe (AA on paper) |
| `--mayday` | `#B23F19` | refusals, arrears, abandonment |
| `--brass` | `#725A2C` | numerals, eyebrows (AA at 12 px) |
| `--brass-soft` | `#A88A54` | hairlines and ornaments only |

Two values were darkened from the brief (`slate`, `brass`, `signal`) so small text passes WCAG AA on
paper. Lustre: an SVG `feTurbulence` grain at 5% and a soft lemon bloom top right, fixed behind
everything.

## Type

Display: **Zodiak** 700 and 800 (Fontshare free licence). UI and body: **General Sans** 400 to 600
(Fontshare). Figures and labels: **Geist Mono** (OFL), tabular numerals, uppercase eyebrows tracked
+0.12em ("Nº 04 · ON BOARD"). All self-hosted woff2 in `app/public/fonts`. No Inter, Roboto, Arial.

## Signature elements

- **Mark:** a brass porthole ring with a lemon crescent of light and a berth-plate chevron
  (`app/components/Logo.tsx`, `app/public/icon.svg`).
- **Capsule nav:** 64 px, radius 18, paper at 85% with blur, brass hairline. Connect button in ink
  with a lemon arrow disc; when connected, an account chip (copy on click) and a power-icon
  disconnect with the label "Disconnect". On phones: logo, Connect, menu sheet.
- **Signature motion, used once:** "lights on board". Twelve portholes on the hero ship light one by
  one while the counter climbs to four months. Reduced motion: all lit at once.
- **Glow cards:** cursor-following lemon light (280 px), a border that brightens, a 2 px lift.
  Off under `prefers-reduced-motion`.
- **Ornaments:** latitude tick marks on section edges, "Nº 01" numbering in brass mono, ledger rules.

## Art (all drawn in code, no stock images)

Hero: a bulk carrier at anchor at dusk, layered flat SVG, accommodation block with twelve portholes,
lemon waterline glow, anchor chain, two gulls, haze; background layers drift on scroll.
Section art: a lock (reserve), tide gauge (daily wages), fenced envelope (allotment), flare
(abandonment), portage bill page.

## States designed as carefully as success

Refused (mayday border, decoded code and plain words, explorer link), waiting (spinner on the
pressed button only), not deployed / RPC down (a plain sentence, never stale numbers), NOT OBSERVED
and REVIEW for the contract reader.
