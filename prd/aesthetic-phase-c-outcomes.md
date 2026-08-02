# Phase C — Hypothetical UI/UX Outcomes

**Status**: Implemented on branch (colophon + worktable collapse + GraphSettle)  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Branch**: `meaesthetic-system-3413`

These boards show the intended implementation outcome for the three remaining aesthetic workstreams.

**Copy note:** Mimi is not a print studio. Prefer “editorial archive,” “worktable,” “provenance,” “issue” in UI copy — avoid “print shop / print rack / print studio.”

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
- [x] Colophon visible on Studio open without opening Used Context panel
- [x] Does not steal > ~12% of viewport height when collapsed
- [x] Expand/approve preserved; empty state: “Mimi will not invent sources”

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
- [x] Moodboard and Darkroom open media-first (`WorktableShell`, tools collapsed by default)
- [x] No permanent multi-row tool strip above media on mobile
- [x] Primary actions reachable from sheet when expanded

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
- [x] New Taste Graph nodes settle (`GraphSettle` on map SVG + cluster cards); existing stay still
- [x] Staggered settle, capped delay
- [x] `prefers-reduced-motion` skips animation
- [x] Olive marks newest nodes; no ambient orbit introduced for this motion

---

## Implementation order (suggested)

1. Studio always-on colophon (reuses existing component)  
2. Moodboard + Darkroom `WorktableShell` collapse  
3. Taste Graph `GraphSettle` wiring + reduced-motion QA  
