# PRD-02: One Composition Per Room

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proofs**:  
- [`proofs/aesthetic/02-front-page-plate.jpg`](../proofs/aesthetic/02-front-page-plate.jpg)  
- [`proofs/aesthetic/02-studio-plate.jpg`](../proofs/aesthetic/02-studio-plate.jpg)

<img alt="Front Page editorial plate" src="/opt/cursor/artifacts/assets/02-front-page-plate.png" />
<img alt="Studio first-viewport plate" src="/opt/cursor/artifacts/assets/02-studio-plate.png" />

---

## Problem

Studio, Signature, Stand, and Front Page often read as **chamber dashboards**: tools, stats, side rails, and secondary marketing compete in the first viewport. The brand feeling dies before the artifact appears.

## Goals

1. Each priority room’s **first viewport = one editorial plate**.
2. Budget: **brand/wordmark + one thesis + one action + one dominant visual**.
3. Defer tools, stats, and side rails to scroll, sheet, or explicit “enter worktable” state.

## Non-goals

- Removing dense tools after entry.
- Redesigning every chamber (focus: Studio, Signature, Stand, Front Page).

## UX / UI intentions by surface

### Front Page (`EditorialFrontPage.tsx`)

| Element | First viewport | Below / secondary |
|---------|----------------|-------------------|
| Brand | Hero-level MIMI | — |
| Thesis | One issue line / dek | Essay list, contributors |
| Action | Enter issue / Read | Subscribe, Gateway |
| Visual | Full-bleed cover (edge-to-edge) | Grid of further pieces |

**Intention:** Mag fold cover, not magazine CMS dashboard. No stats, schedules, or promo chips in viewport 1 (aligns with existing front-page functional spec’s “current issue” spirit).

### Studio (`InputStudio` / Quiet Studio / Cover)

| Element | First viewport | After “Open worktable” |
|---------|----------------|------------------------|
| Brand | Wordmark + issue title | Chrome binder |
| Thesis | One line on composing from approved evidence | Brief fields |
| Action | Open worktable / Continue draft | Generate, Pocket, rails |
| Visual | Dominant cover / canvas plate | Tool sheets |

**Intention:** Landing plate → worktable. Do not dump Context tray + brief + generate + cover slot simultaneously on entry.

### Signature (`SignatureView.tsx`)

| Element | First viewport | Secondary |
|---------|----------------|-----------|
| Brand | MIMI + “Signature” | — |
| Thesis | Aesthetic name / plate title | Charts, DNA metrics |
| Action | Export / Share | Regenerate, history |
| Visual | Collectible plate (see PRD-03) | Drift charts |

**Intention:** Collectible object first; analytics are back matter.

### Stand (`TheStand.tsx`)

| Element | First viewport | Secondary |
|---------|----------------|-----------|
| Brand | Creator serif name | Mode tabs if needed |
| Thesis | One line (“Issues on the stand”) | Search, floor feed |
| Action | Open latest issue | Community floor |
| Visual | Column-ruled cover grid | Comments drawer |

**Intention:** Zine rack, not profile dashboard (no follower/stat strips).

## Acceptance criteria

- [ ] Studio / Signature / Stand / Front Page first viewport passes the **hero budget** (no stats/tool dumps).
- [ ] Dominant visual is full-bleed or plate-aligned, not a small inset card.
- [ ] Secondary tools require scroll, sheet, or explicit enter action.
- [ ] Mobile and desktop both preserve one-composition reading.

## Technical notes

- Likely introduce a shared `EditorialPlate` shell (wordmark, thesis, CTA slot, visual slot).
- Front Page: restructure `EditorialFrontPage` so essays/contributors start below the fold.
- Studio: gate dense `StudioChrome` behind worktable entry or collapse-to-sheet on mobile (see PRD-04).

## Edge cases

| Case | Behavior |
|------|----------|
| Empty Stand | One empty plate with single CTA “Compose first issue” |
| Guest Studio | Same plate; action becomes Gateway / start draft |
| Long thesis | Truncate to one sentence; full brief lives inside worktable |

## Open questions

1. Should Quiet Studio and full Input Studio share the same entry plate?
2. Is “Enter worktable” a route change (`/studio/worktable`) or an in-place reveal?
