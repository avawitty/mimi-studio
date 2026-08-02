# PRD-05: Provenance as Design — Used Context Colophon

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proof**: [`proofs/aesthetic/05-colophon-used-context.jpg`](../proofs/aesthetic/05-colophon-used-context.jpg)

<img alt="Used Context as colophon" src="/opt/cursor/artifacts/assets/05-colophon-used-context.png" />

---

## Problem

Used Context is Mimi’s product differentiator versus Midjourney-style generation UIs — but it often presents as a **developer tray** (chips, approve-all dumps, compile checklists). Provenance should feel like a **colophon / press mark**: typographic, quiet, always present.

## Goals

1. Redesign Used Context UI as a **colophon component** on generate/compose/publish surfaces.
2. Always visible in a quiet form; expandable for review/approve.
3. Preserve existing approval semantics (`usedContextService`, approve gates).

## Non-goals

- Changing the data model of `UsedContextEntry` / snapshots.
- Hiding provenance behind settings.

## UX / UI intentions

### Quiet state (always on)

```
────────────────────────────────────────
COLOPHON
Used Context — 4 approved references
[■][■][■][■]  ·  Review
```

- Hairline rule above.
- Label `COLOPHON` in tracked Geist microcaps.
- Line in Cormorant italic stating count + status.
- Tiny monochrome thumbs as press marks (not colorful chips).
- Olive square press mark optional.

### Expanded state (review)

- Typographic list: title, source type, approved/pending.
- Actions: Approve / Remove / Open evidence — text buttons, not pill clouds.
- No “developer” JSON; link to atom detail if needed.

### Placement

| Surface | Placement |
|---------|-----------|
| Studio worktable | Bottom colophon under canvas |
| The Edit / compile | Colophon above publish |
| Darkroom export | Colophon on export plate |
| Signature / Share | Printed into export footer |
| Front Page piece | End-matter colophon |

### What to remove visually

- Dense chip wrap clusters as the primary look.
- Tray chrome that looks like a debug inspector.
- Glow/signal treatments on provenance (pearl glow stays on CTAs if needed, not on colophon).

## Acceptance criteria

- [ ] Generate/compose surfaces show quiet colophon without opening a tray.
- [ ] Expand/collapse review supports approve/remove.
- [ ] Empty state: “No approved context — Mimi will not invent sources.”
- [ ] Export/share artifacts include colophon line where applicable.
- [ ] Existing approve-before-compile gates still enforced.

## Technical context

- `services/usedContextService.ts`, `types.ts` (`UsedContextEntry`, `UsedContextSnapshot`).
- Call sites: Studio, The Edit, FounderStrategyMemo, Moodboard → Studio queue, Scribe threads.
- New presentational component e.g. `components/provenance/UsedContextColophon.tsx`.

## Edge cases

| Case | Behavior |
|------|----------|
| 0 entries | Quiet empty colophon + CTA to add from Pocket/Scribe |
| Mixed approved/pending | Count both; italic line states “2 approved · 1 pending” |
| Long list | Expand shows scrollable typographic list; quiet state shows first 4 thumbs + “+N” |

## Open questions

1. Always-expanded on publish review screens?
2. Should colophon be part of rasterized Signature/Share PNG (yes recommended)?
