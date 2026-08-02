# PRD-06: Motion with Editorial Purpose

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proof**: [`proofs/aesthetic/06-motion-storyboard.jpg`](../proofs/aesthetic/06-motion-storyboard.jpg)

<img alt="Three editorial motions storyboard" src="/opt/cursor/artifacts/assets/06-motion-storyboard.png" />

---

## Problem

Ambient glow, pill clusters, and cyberdeck noise dilute Mimi’s archival identity (except where Oracle already owns that tone). Motion should sell **press mechanics**, not AI spectacle.

## Goals

Ship **exactly three** intentional product motions for the aesthetic system:

1. **Page-turn / press reveal** — entering an issue, opening a plate, Front Page → piece.
2. **Approval stamp** — approving Used Context / memory atoms.
3. **Evidence → graph settle** — evidence thumbs settling into Taste Graph nodes.

## Non-goals

- Ambient particle fields, continuous glow, neon pulses on public/worktable surfaces.
- Reworking Oracle motion language (exempt).
- Heavy 3D page engines; keep performant CSS/Motion.

## UX / UI intentions

### 1. Page-turn / press reveal

- **Trigger:** Open issue, enter Studio worktable from plate, Front Page cover → essay.
- **Feel:** Soft rotation/Y-flip or layered sheet lift with hairline shadow; 280–420ms.
- **Avoid:** Zoom blur, neon wipe.

### 2. Approval stamp

- **Trigger:** Approve Used Context entry or atom.
- **Feel:** Brief ink stamp: rectangular “APPROVED” impression, 1–2 soft overprint frames; optional olive mark.
- **Avoid:** Green pill toast as the primary celebration (toast may still confirm accessibly).

### 3. Evidence → graph settle

- **Trigger:** Approved evidence added to Taste Graph / constellation.
- **Feel:** Thumbs arc to node positions; edges draw; settle with slight overshoot then still.
- **Avoid:** Continuous orbiting, glow nodes.

### Motion budget rules

- Prefer `motion/react` (already in app) with reduced-motion fallbacks (`prefers-reduced-motion`: instant state change + static stamp glyph).
- Max one of these motions at a time.
- No new glow keyframes on public face components.

## Acceptance criteria

- [ ] Three motions implemented on real triggers with reduced-motion support.
- [ ] Demo script / QA can show all three without Oracle.
- [ ] No new ambient glow or pill-burst patterns introduced on covered surfaces.
- [ ] Stamp and colophon feel related (shared ink language).

## Technical context

- `motion/react` already used in Front Page, Signature, Stand.
- Taste Graph: `TasteGraph.tsx`, `LatentConstellation.tsx`.
- Approval paths: `usedContextService.setUsedContextApproved`, Edit/Studio approve UI.

## Edge cases

| Case | Behavior |
|------|----------|
| Reduced motion | Skip animation; show final stamped/settled state |
| Bulk approve | One stamp on the group, not N stacked animations |
| Graph with many nodes | Animate only new nodes; existing stay still |

## Open questions

1. Stamp sound? (Default no; keep silent unless brand audio system exists.)
2. Page-turn shared primitive vs per-surface variants?
