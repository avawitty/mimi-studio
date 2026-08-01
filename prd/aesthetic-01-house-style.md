# PRD-01: House Style v2 — Print-Shop Discipline

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proof**: [`proofs/aesthetic/01-house-style-board.jpg`](../proofs/aesthetic/01-house-style-board.jpg)

<img alt="House style specimen board" src="/opt/cursor/artifacts/assets/01-house-style-board.png" />

---

## Problem

Cormorant + Geist + grain is already Mimi, but token usage drifts into warm cream panels (`--nous-paper`, `--studio-chrome`), soft lifestyle serif blocks, and accent mush. Competitors and AI UIs cluster on cream/serif/terracotta; Mimi must look sharper and more archival.

## Goals

1. Lock a **high-contrast black/white** base with **olive `#5A5A40`** and **stone `#78716c`** as the only accents.
2. Reduce warm-cream panel surface area; prefer white field + hairline rules.
3. Keep paper grain as a **quiet print tooth**, not a beige wash.
4. Publish an anti-drift checklist for designers/agents.

## Non-goals

- Removing Cormorant or Geist.
- Forcing Oracle into the quiet public language.
- Full dark-mode retirement (worktables may keep dark canvas).

## UX / UI intentions

### Token map (House Style v2)

| Role | Token intent | Notes |
|------|--------------|-------|
| Field | `#FFFFFF` public / `#FAFAFA` worktable | Prefer pure white over `#f9f7f2` on public surfaces |
| Ink | `#000000` / `#0A0A0A` | High contrast titles and rules |
| Subtle | `#404040` | Body secondary |
| Accent A | Olive `#5A5A40` | Folio marks, press mark, rare emphasis |
| Accent B | Stone `#78716C` | Metadata, quiet UI chrome |
| Border | `#E5E5E5` → prefer `#D4D4D4` hairlines | Column rules over filled panels |
| Grain | Cool/neutral texture @ ≤12% opacity | Not warm cream paper fill |

### Typography discipline

- **Serif (Cormorant)**: brand, theses, Signature names, essay titles, colophon italics.
- **Sans (Geist)**: UI labels, tracked uppercase microcopy, buttons default.
- **Mono (JetBrains)**: provenance IDs, folio numbers, atom IDs — sparingly.
- Ban: Inter/Roboto as display; oversized serif walls that overpower the wordmark.

### Composition rules

- Prefer **column rules and margins** over cards.
- Default **border-radius: 0** on public surfaces (already pearl-button style).
- No purple CTAs; primary action = black rectangle or inverse white/black.
- No pill clusters; no multi-layer soft shadows on public chrome.

### Anti-drift checklist (acceptance)

- [ ] First viewport without nav still reads as Mimi (brand test).
- [ ] No large warm-cream panel as the primary field on Front Page / Share / Signature / Stand.
- [ ] No terracotta / purple / glow accents on public face.
- [ ] Olive appears only as mark/folio/colophon accent, not as fill theme.
- [ ] Grain does not read as lifestyle “cream blog” background.

## Technical context

- Migrate consumers of `--nous-paper` and `--studio-chrome` in `index.css`.
- Scope pearl glow in `mimiMaterials.css` — keep for interactive controls if needed, suppress on public plates.
- Document tokens in a short `docs/house-style-v2.md` during implementation.

## Edge cases

| Case | Behavior |
|------|----------|
| Dark worktable | Black canvas OK; cream binder chrome optional but must not leak into public surfaces |
| Legacy zine treatments | User-selected warm palettes allowed inside artifacts; chrome stays house style |
| Oracle | Exempt from quiet public language; still avoid cream/terracotta cliché |

## Open questions

1. Retire `--nous-paper` globally or alias it to white on `data-surface="public"`?
2. Keep Bodoni/Public Sans era variants, or freeze Ethereal (Geist+Cormorant) as sole shipping era?
