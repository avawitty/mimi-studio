# PRD-07: One Public Face

**Status**: Ideation / Draft  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Proof**: [`proofs/aesthetic/07-public-face-family.jpg`](../proofs/aesthetic/07-public-face-family.jpg)

<img alt="Public face family board" src="/opt/cursor/artifacts/assets/07-public-face-family.png" />

---

## Problem

Front Page, Share Card, Signature, and Stand currently feel related in spirit but not locked as one system. Internal chambers can stay denser; **public surfaces must feel precious and consistent**.

## Goals

1. Shared visual language: **white field · serif name · column rules · Geist micro labels · olive press mark**.
2. Shared spacing/type scale for public surfaces.
3. Clear boundary: public face vs internal chamber density.

## Non-goals

- Making Studio/Darkroom look like the Front Page.
- Homogenizing Oracle.

## UX / UI intentions

### Public face kit

| Element | Spec |
|---------|------|
| Field | White `#FFFFFF`, cool grain ≤12% |
| Name / wordmark | Cormorant, black, generous size — product name as **`Mimi`** (title case), never `MIMI` |
| Rules | 1px hairline column/section rules |
| Meta | Geist uppercase tracked 0.2–0.35em |
| Accent | Olive press mark / folio only |
| CTA | Black rectangle or text link with arrow — no purple pills |
| Provenance | Colophon (PRD-05) |

### Surfaces in the family

| Surface | File(s) | Role |
|---------|---------|------|
| Front Page | `EditorialFrontPage.tsx` | Publishing face |
| Share Card | `SocialShareModal.tsx`, share meta images | Portable plate |
| Signature | `SignatureView` + export | Identity collectible |
| Stand | `TheStand.tsx`, public profile/share pages | Zine rack |
| Public share pages | `PublicSharePage.tsx`, `PublicZineSharePage.tsx` | External landing |

### Consistency checklist

- [ ] Same wordmark treatment and margins.
- [ ] Same serif/sans roles.
- [ ] Same hairline language (no mixed thick card borders).
- [ ] Same colophon pattern on artifacts that leave the app.
- [ ] Dark mode: public face prefers light plate even if app chrome is dark (recommended).

## Acceptance criteria

- [ ] Side-by-side review of four surfaces passes “one family” test (see proof).
- [ ] Removing nav, a stranger can still identify Mimi across Share/Signature/Stand/Front Page.
- [ ] Internal chambers may diverge after entry but public routes stay locked.

## Technical notes

- Extract `components/public-face/` primitives: `PublicField`, `SerifName`, `ColumnRule`, `PressMark`, `PublicCTA`.
- Align SEO/share image generation (`lib/mimiProvider.ts` SVG cards, `geminiService` share SVGs) to the same kit — currently dark cream-leaning cards should move toward white plate.

## Edge cases

| Case | Behavior |
|------|----------|
| User artifact with loud palette | Artifact keeps palette; chrome/colophon stay house style |
| Embed/iframe | Public face kit still applies at small widths |
| Print CSS | Hairlines and serif names survive print stylesheet |

## Open questions

1. Force light public plates inside dark app shell?
2. Single Figma/Magic Patterns library source of truth for the kit?
