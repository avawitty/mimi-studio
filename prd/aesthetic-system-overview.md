# PRD: Mimi Aesthetic System — Print-Shop Discipline

**Status**: Ideation / Draft  
**Branch**: `meaesthetic-system-3413`  
**Type**: Design systems + surface UX  
**Related**: `docs/editorial-front-page-functional-spec.md`, `index.css`, `components/ui/mimiMaterials.css`  
**Proofs**: `proofs/aesthetic/`

---

## Problem statement

Mimi already owns a distinctive archival kit — **Cormorant Garamond + Geist Variable + paper grain** — but public and chamber surfaces drift toward a generic “AI editorial” look: warm cream panels, soft lifestyle serif, terracotta/stone mush, and chamber dashboards that dump tools, stats, and rails into the first viewport.

The product differentiator is not “pretty generation UI.” It is **approved taste made visible** — Used Context as provenance, Signature and Stand as shareable objects, worktables that put the artifact first. Aesthetic work must harden that identity into a sharper house style and one public face.

## North-star aesthetic thesis

> **Print-shop archive, not lifestyle blog.**  
> High-contrast black/white field, olive and stone as accents only, serif for names and theses, Geist for system, column rules over cards, provenance as colophon, motion as press mechanics.  
> **Wordmark casing: `Mimi`** (title case in Cormorant) — not all-caps `MIMI`, not `mimi` as display brand.

## Pillars (mapped PRDs)

| # | Pillar | PRD | Proof |
|---|--------|-----|-------|
| 1 | Keep archival identity, tighten the system | [`aesthetic-01-house-style.md`](./aesthetic-01-house-style.md) | `01-house-style-board.jpg` |
| 2 | One composition per room | [`aesthetic-02-one-composition.md`](./aesthetic-02-one-composition.md) | `02-studio-plate.jpg`, `02-front-page-plate.jpg` |
| 3 | Signature & Stand as shareable objects | [`aesthetic-03-signature-stand.md`](./aesthetic-03-signature-stand.md) | `03-signature-plate.jpg`, `03-stand-grid.jpg` |
| 4 | Reduce chrome, increase artifact | [`aesthetic-04-reduce-chrome.md`](./aesthetic-04-reduce-chrome.md) | `04-worktable-mobile.jpg` |
| 5 | Provenance as design | [`aesthetic-05-provenance-colophon.md`](./aesthetic-05-provenance-colophon.md) | `05-colophon-used-context.jpg` |
| 6 | Motion with editorial purpose | [`aesthetic-06-editorial-motion.md`](./aesthetic-06-editorial-motion.md) | `06-motion-storyboard.jpg` |
| 7 | One public face | [`aesthetic-07-public-face.md`](./aesthetic-07-public-face.md) | `07-public-face-family.jpg` |

**UX/UI plan (cross-cutting):** [`aesthetic-ux-ui-plan.md`](./aesthetic-ux-ui-plan.md)

## Goals

1. Codify a **House Style v2** token set that resists cream/terracotta drift while keeping Cormorant + Geist + grain.
2. Redesign first viewports of Studio, Signature, Stand, and Front Page as **one editorial plate** each.
3. Make Signature (exportable plate / 9:16) and Stand (zine grid) the primary **shareable brand objects**.
4. Collapse tool chrome on Moodboard, Studio, Darkroom — especially mobile — so media is hero.
5. Restyle Used Context as a **colophon / press mark**, always present, never a developer tray.
6. Ship **2–3 intentional motions** (page-turn/press reveal, approval stamp, evidence→graph settle); ban ambient glow/pill clusters outside Oracle.
7. Align Front Page, Share Card, Signature, Stand on one **public visual language**.

## Non-goals

- Full redesign of Oracle cyberdeck tone (Oracle keeps its own denser language).
- Replacing functional chamber density after the first viewport.
- Implementing production UI in this ideation PR (specs + proofs only).
- Changing product AI / generation pipelines.

## Success metrics (post-implementation)

| Signal | Target |
|--------|--------|
| Brand test | First viewport of public surfaces still reads as Mimi with nav removed |
| Composition | Studio / Signature / Stand / Front Page first screen ≤ 1 thesis + 1 CTA + 1 dominant visual |
| Share objects | Signature PNG + 9:16 export used in ≥1 documented share path |
| Chrome budget | Mobile worktables: tool strip collapsed by default; canvas ≥70% viewport height |
| Provenance | Used Context visible on generate/compose surfaces without opening a debug tray |
| Motion | Only the three editorial motions in marketing/product demo; no new glow/pill patterns |

## Technical anchors (current code)

| Area | Path |
|------|------|
| Tokens / eras | `index.css` (`--nous-*`, `--era-*`, `.studio-worktable`) |
| Materials / pearl | `components/ui/mimiMaterials.css` |
| Front Page | `components/EditorialFrontPage.tsx` |
| Signature | `components/SignatureView.tsx`, `SignatureImageGenerator.tsx`, `services/signatureService.ts` |
| Stand | `components/TheStand.tsx`, `ZineCoverCard.tsx` |
| Studio chrome | `components/studio/StudioChrome.tsx`, `InputStudio.tsx`, `QuietStudioView.tsx` |
| Moodboard / Darkroom | `MoodBoardChamber.tsx`, `MoodboardComposer.tsx`, `DarkroomView.tsx` |
| Used Context | `services/usedContextService.ts`, Studio / The Edit trays |
| Public share | `PublicSharePage.tsx`, `PublicZineSharePage.tsx`, `SocialShareModal.tsx` |

## Risks

- **Cream inertia**: `--nous-paper: #f9f7f2` and `.studio-chrome: #f3f1ea` currently dominate; tightening requires token migration, not just copy.
- **Chamber utility**: Collapsing chrome must not bury frequent actions (Generate, Pocket, Used Context approve).
- **Oracle exception**: Must not sand Oracle into quiet print shop; keep tonal boundary explicit.
- **Proof vs ship**: Ideation images are direction, not pixel specs; implementation should re-ground in live components.

## Open questions

1. Should public surfaces be **light-only** (precious white field) with dark reserved for worktables?
2. Is Signature the canonical share object for identity, or does Stand’s cover grid share that role equally?
3. Colophon density: always-expanded micro line vs. expandable press mark?
4. Do we retire warm paper grain globally, or keep grain only on public print surfaces at lower opacity?

## Delivery phasing (implementation follow-up)

1. **Tokens** — House Style v2 CSS variables + anti-drift checklist  
2. **Public face** — Front Page / Share / Signature / Stand language lock  
3. **Worktables** — Studio / Moodboard / Darkroom chrome collapse  
4. **Colophon** — Used Context component rewrite  
5. **Motion** — three editorial motions wired to real actions  

---

*ChatPRD sync skipped this pass (MCP auth unavailable). Local `prd/` is source of truth for this branch.*
