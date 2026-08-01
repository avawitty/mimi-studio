# PRD-04: Reduce Chrome, Increase Artifact

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proof**: [`proofs/aesthetic/04-worktable-mobile.jpg`](../proofs/aesthetic/04-worktable-mobile.jpg)

<img alt="Mobile worktable media-first" src="/opt/cursor/artifacts/assets/04-worktable-mobile.png" />

---

## Problem

Moodboard, Studio, and Darkroom often present as tool consoles. On mobile especially, icon strips and panels steal the viewport from the media being made. Mimi should feel like a **worktable**: canvas first, tools in sheets/rails.

## Goals

1. Full-bleed (or near full-bleed) canvas as default in Moodboard / Studio / Darkroom.
2. Tools live in **collapsible sheets** (mobile) and **rails** (desktop), not permanent top dumps.
3. Mobile: tool strips collapsed by default; media ≥ ~70% viewport height.

## Non-goals

- Removing tools.
- Redesigning Oracle’s dense HUD.

## UX / UI intentions

### Shared worktable pattern

```
┌─────────────────────────────┐
│ MIMI · Issue          [···] │  ← 40–48px chrome
├─────────────────────────────┤
│                             │
│         CANVAS / MEDIA      │  ← hero
│                             │
├─────────────────────────────┤
│ ▔ Tools · Context · Export  │  ← collapsed sheet peek
└─────────────────────────────┘
```

### Desktop

- Left or right **rail** collapsed to icon spine; expand on demand.
- Top binder chrome thinned; avoid dual cream bands + floating panels.
- Used Context as colophon strip (PRD-05), not a tall tray.

### Mobile

- Default: canvas + sheet peek.
- Sheet sections: Brief, Used Context, Treatments, Export.
- Primary generate/approve actions: sticky inside sheet header when expanded; floating only if unavoidable (rectangular, not pill glow).

### Surface-specific

| Surface | Dominant artifact | Chrome to collapse |
|---------|-------------------|--------------------|
| Moodboard | Board collage | Synth controls, shard lists |
| Studio | Cover / spread preview | Brief, pocket, generate stack |
| Darkroom | Active print / develop view | Grain/filter stacks |

## Acceptance criteria

- [ ] Mobile worktables open with tools collapsed.
- [ ] Canvas/media occupies majority of first screen height.
- [ ] Desktop rails start collapsed or icon-spine.
- [ ] No permanent multi-row tool strip above the media on mobile.

## Technical context

- `StudioChrome.tsx`, `StudioPocketDrawer.tsx`, `InputStudio.tsx`, `MoodBoardChamber.tsx`, `MoodboardComposer.tsx`, `DarkroomView.tsx`.
- Prefer existing sheet/drawer patterns; avoid new floating widget frameworks.
- Align with `.studio-worktable` tokens after House Style v2 migration.

## Edge cases

| Case | Behavior |
|------|----------|
| Keyboard open (mobile) | Sheet compresses; canvas may shrink but remains visible |
| Multi-select tools | Temporary tool mode bar OK; dismisses on complete |
| Empty canvas | Full-bleed empty plate with one CTA |

## Open questions

1. Should Darkroom keep a persistent develop strip for tactile “enlarger” metaphor?
2. Shared `<WorktableShell>` component vs per-chamber implementations?
