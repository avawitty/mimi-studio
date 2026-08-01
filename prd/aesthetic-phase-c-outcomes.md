# Phase C — Hypothetical UI/UX Outcomes

**Status**: Spec + generate-image proofs (not yet implemented)  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Branch**: `meaesthetic-system-3413`

These boards show the intended implementation outcome for the three remaining aesthetic workstreams.

---

## 1. Always-on Studio canvas colophon

**Proof:** [`proofs/aesthetic/08-studio-canvas-colophon.jpg`](../proofs/aesthetic/08-studio-canvas-colophon.jpg)

<img alt="Studio canvas with always-on colophon" src="/opt/cursor/artifacts/assets/08-studio-canvas-colophon.png" />

### Intention
- Cover/canvas remains the hero; tools stay on an icon spine / sheet.
- **Used Context colophon is always visible** under the canvas — quiet typographic strip, not a tray you must open.
- Micro label `COLOPHON` + Cormorant italic count line + 4 press-mark thumbs + `Review`.
- Approve expands in place; stamp motion fires on approve (`ApprovalStamp`).
- Component: extend `UsedContextColophon` into Studio worktable layout (outside orchestrator panel).

### Acceptance
- [ ] Colophon visible on Studio open without opening Used Context panel
- [ ] Does not steal > ~12% of viewport height when collapsed
- [ ] Expand/approve preserved; empty state: “Mimi will not invent sources”

---

## 2. Moodboard / Darkroom chrome collapse

**Proof:** [`proofs/aesthetic/09-moodboard-darkroom-collapse.jpg`](../proofs/aesthetic/09-moodboard-darkroom-collapse.jpg)

<img alt="Moodboard and Darkroom chrome collapse" src="/opt/cursor/artifacts/assets/09-moodboard-darkroom-collapse.png" />

### Intention
- **Moodboard:** full-bleed collage; tools in bottom sheet peek (`Tools`).
- **Darkroom:** full-bleed print; develop stack in collapsed rail/sheet.
- Shared `WorktableShell` pattern: thin top bar (**Mimi** + issue) → canvas → sheet.
- Mobile default: tools collapsed; media ≥ ~70% height.

### Acceptance
- [ ] Moodboard and Darkroom open media-first
- [ ] No permanent multi-row tool strip above media on mobile
- [ ] Primary actions reachable from sheet header when expanded

---

## 3. Wire `GraphSettle` into Taste Graph

**Proof:** [`proofs/aesthetic/10-graph-settle-taste-graph.jpg`](../proofs/aesthetic/10-graph-settle-taste-graph.jpg)

<img alt="Evidence to Taste Graph settle" src="/opt/cursor/artifacts/assets/10-graph-settle-taste-graph.png" />

### Intention
- When approved evidence lands in Taste Graph, **new nodes only** settle with `GraphSettle`.
- Existing nodes stay still; edges draw once; olive marks newest nodes briefly.
- Reduced motion: instant final positions.
- Wire in `TasteGraph.tsx` / `LatentConstellation.tsx` on node mount keyed by atom/node id.

### Acceptance
- [ ] Approving evidence triggers settle for new nodes only
- [ ] Bulk approve: staggered settle, capped delay
- [ ] `prefers-reduced-motion` skips animation
- [ ] No ambient glow / orbiting nodes introduced

---

## Implementation order (suggested)

1. Studio always-on colophon (reuses existing component)  
2. Moodboard + Darkroom `WorktableShell` collapse  
3. Taste Graph `GraphSettle` wiring + reduced-motion QA  
