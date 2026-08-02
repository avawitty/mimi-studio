# PRD-03: Signature & Stand as Shareable Aesthetic Objects

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proofs**:  
- [`proofs/aesthetic/03-signature-plate.jpg`](../proofs/aesthetic/03-signature-plate.jpg)  
- [`proofs/aesthetic/03-stand-grid.jpg`](../proofs/aesthetic/03-stand-grid.jpg)

<img alt="Signature collectible 9:16 plate" src="/opt/cursor/artifacts/assets/03-signature-plate.png" />
<img alt="Stand zine column grid" src="/opt/cursor/artifacts/assets/03-stand-grid.png" />

---

## Problem

Brand feeling currently lives inside the app’s chambers. Outside Mimi, Midjourney-style UIs win on spectacle; Mimi should win on **precious, attributable objects**. Signature and Stand are the natural share surfaces — but Signature still leans dashboard/DNA-card, and Stand leans profile feed.

## Goals

1. **Signature** = collectible plate (square/export PNG + 9:16 story).
2. **Stand** = zine grid with column rules and quiet typography — not a profile dashboard.
3. Both speak the same public language as Front Page / Share Card (PRD-07).

## Non-goals

- Replacing Taste Graph analytics entirely (they become secondary/back matter).
- Building a full social network on Stand.

## UX / UI intentions

### Signature — collectible plate

**Primary object**
- White field, inset hairline plate border.
- Aesthetic name in Cormorant (hero).
- Geometric press mark derived from signature DNA (black + olive only).
- Colophon line: approved atom count · plate date · **Mimi**.
- No charts on the exportable face.

**Exports**
| Format | Use |
|--------|-----|
| 1:1 PNG | Share card / site embed |
| 9:16 PNG | Stories / Reels cover |
| Optional PDF plate | Print / press kit later |

**In-app layout**
1. Viewport 1: live plate + Export / Share.
2. Below: provenance colophon (links to Used Context).
3. Deeper: drift charts / regenerate (collapsed).

**Code anchors:** `SignatureView.tsx`, `SignatureImageGenerator.tsx`, `html-to-image` export path already present — restyle export DOM to plate spec.

### Stand — zine rack

**Primary object**
- Serif creator name, Geist handle.
- 2–3 column cover grid aligned to **column rules** (catalog, not card deck).
- Covers flush to grid; no heavy drop shadows; no rounded media cards.
- Folio labels in olive/stone micro type (“ISSUE 03”).
- Search as underline field, not pill.

**Remove / demote from first viewport**
- Stat strips, radio/cyber chrome excess, dashboard tabs competing with the grid.
- Keep Mine / Floor, but as quiet text toggles under the name.

**Code anchors:** `TheStand.tsx`, `ZineCoverCard.tsx` — restyle card to plate cell.

## Acceptance criteria

- [ ] Signature export produces plate without charts/UI chrome.
- [ ] 9:16 story export exists and matches plate language.
- [ ] Stand first viewport reads as zine grid; no follower/stat dashboard.
- [ ] Shared tokens with Front Page / Share (white field, serif name, column rules).

## Edge cases

| Case | Behavior |
|------|----------|
| No signature yet | Empty plate with thesis + “Compose signature” |
| Unpublished only | Stand shows private plate state, not empty dashboard |
| Long aesthetic name | Typographic scale-down; never truncate mid-word on export |

## Open questions

1. Is the geometric mark generative from Taste Graph, or a fixed press family?
2. Public Stand URL vs in-app Stand — same layout?
