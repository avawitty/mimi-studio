# Mimi Studio — Design Inspiration Brief

**Source:** Pinterest board "mimi" (Ava Wittkop, ~203 pins) — pinterest.com/sheshotmedown/mimi  
**Distilled for:** Mimi Studio UX/UI (psychic-oracle-spy meets archival editorial)  
**House alignment:** Apply motifs through House Style v2 + Signal Underarchive. Do **not** promote bone/newsprint cream as the primary public field (that fights `prd/aesthetic-signal-underarchive.md` and anti-cliché rules). Cream/manila stays a dossier *nod*, not the Front Page field.

## The Board's Core DNA

The board is overwhelmingly **editorial / archive / atelier** — not SaaS, not dashboard, not tech.

Recurring languages:

1. **Archival paper systems** — manila folders, index tabs, binder clips, hole-punched pages, ring binders, specimen sheets, file cards with typed labels
2. **Quiet-luxury editorial** — muted ad layouts, generous whitespace, one image + one caption
3. **Specimen & X-ray botanicals** — pressed grids, ink florals on black, anatomical plates (oracle-coded)
4. **Handmade ephemera** — handwritten postcards, cursive memo cards, translucent vellum, wax-seal energy
5. **Collage / pinned artifacts** — taped Polaroids, paper-clipped photos, clipped receipts, tools as instruments
6. **Muted duotone websites** — black/cream perfume atelier sites, serif wordmark top-left, tiny nav

## Palette (board → product mapping)

| Board note | Product use |
|------------|-------------|
| Bone / newsprint cream | Manila dossier motif only (`--mimi-manila-*`) — not public hero field |
| Ink black `#111110` | Maps to `--mimi-ink` / void plates |
| Pencil / grid greys | Hairlines, meta labels |
| Blueprint / periwinkle | Signal Underarchive Accent C (`--mimi-cobalt`) — stamps, corners, never full-bleed public wash |
| Lipstick red (once per page) | Single seal / stamp hit — sparingly |
| Blush pink | Rare ephemera only |

Primary public kit remains: **white field · olive press · cobalt accent · Geist micro · Cormorant name**.

## Typography

- Display: high-contrast editorial serif (Cormorant / Bodoni family already in app)
- Body/labels: mono typewriter energy for `CASE FILE`, `INDEX`, fig. captions (JetBrains Mono / Geist mono tracking)
- Accent: handwritten cursive used sparingly for oracle annotations — never as UI chrome

## Motifs to steal for Mimi Studio

1. **The Dossier** — project/zine as manila folder with index tab + typed metadata (`DossierTab`, Captive Sentinel)
2. **Specimen sheets** — single artifact centered, tiny mono caption (`fig. 03 — reading`)
3. **X-ray botanicals on black** — dark mode / Scry / Rip / Oracle void moments
4. **Clipped collage hero** — landing as physical desk energy (interactive, not sticker spam)
5. **Typewriter annotations** — playful classification (`CONFIDENTIAL-ish`), mono uppercase, letterspaced
6. **Lace/doily border** — one ornamental divider per page max
7. **The single red mark** — wax seal / approved stamp — never more than one per viewport

## What the board says NOT to do

- No gradients-as-product, glassmorphism, or rounded-2xl SaaS cards
- No multi-color palettes — 2-accent system (olive + cobalt)
- No dense dashboards — every screen breathes like a magazine spread
- No stock 3D icons — scanned/photographed textures or line illustrations

## Applied screen directions

| Surface | Direction |
|---------|-----------|
| Studio home | Filing-cabinet index: folders with tabs, mono metadata |
| Zine canvas | Specimen sheet; red seal on publish |
| Oracle / Scry | Black screen, X-ray botanical energy, serif italic question, mono readout |
| Settings / account | Index card with typed fields, pencil-grey rules |
| App shell | Chamber-aware pad + `SurveillanceOverlay` (scan whisper / registry corners by family) |

## Implementation pointers

- Chamber family + face kind: `lib/chamberChrome.ts`
- Atmosphere overlay: `components/chrome/SurveillanceOverlay.tsx`
- Public primitives: `components/public-face/*`
- Specs: `prd/aesthetic-*.md`, especially `aesthetic-signal-underarchive.md` and `aesthetic-07-public-face.md`
