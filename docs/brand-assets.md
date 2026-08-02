# Brand assets — roles & casing

Canonical product name: **`Mimi`** (title case, Cormorant Garamond).  
Never ship all-caps `MIMI` on public/entry surfaces. See `house-style-v2.md`.

## North star

**Spell it `Mimi` everywhere a human reads the name; crop `mi` only where the square has to work as a glyph.**

## Role matrix

| Role | Asset | Casing | Notes |
|------|--------|--------|-------|
| Wordmark (UI) | `MimiWordmark` component | **`Mimi`** | Live type in app — source of truth for plates |
| Primary wordmark SVG | `public/brand/official/mimi-primary-wordmark-{light,dark}.svg` | **`Mimi`** | Export / static lockups |
| Homepage / OG lockup | `mimi-homepage-lockup-{light,dark}.svg` | **`Mimi`** | Wide social / header compositions |
| Loading / stamps / signatures | `mimi-loading-*`, `mimi-*-stamp-*`, `mimi-*-signature-*` | **`Mimi`** | Full name visible → title case |
| App icon (PWA / home screen) | `mimi-app-icon-crop-{light,dark}.svg` → `/mimi-app-icon.png` | cropped **`mi`** | Mark, not a spelling of the name |
| Favicon | `/favicon.svg` | cropped **`mi`** | Same family as app icon; light/dark via `prefers-color-scheme` |
| Apple touch | `/mimi-app-icon.png` (+ `mimi-app-icon-180.png`) | cropped **`mi`** | Regenerated from light icon crop |

## Color variants

- **Light** — ink `#17140F` on pale field (`#FAFAFA` / transparent).
- **Dark** — ink `#F4F0E6` on near-black.

Accent whispers (olive, light blue `#9BB8CE`) stay off the core mark unless regenerating a deliberate variant.

## Regeneration

```bash
# Requires Playwright Chromium (same as e2e)
node scripts/renderBrandIcons.mjs
```

Writes:

- `public/mimi-app-icon.png` (512)
- `public/brand/official/mimi-app-icon-180.png`
- `public/brand/official/mimi-app-icon-dark-512.png`

Prefer lean SVGs in `public/brand/official/` (no embedded woff). Heavy Figma exports with inlined fonts are source archives only — do not commit as shipping assets.

## Social / OG

Use a **wide lockup** (`Mimi` wordmark + short line), not the cropped `mi` alone on 1200×630 cards. Default site tags currently point at `/mimi-header.png`; when refreshing OG art, start from `mimi-homepage-lockup-light.svg`.

## Anti-drift

- [ ] App icon / favicon share the same crop family
- [ ] Readable name surfaces say **`Mimi`**, not `mimi` / `MIMI`
- [ ] Home-screen title / PWA short name can be `Mimi` (not `mimi zine`)
- [ ] Manila / light-blue accents stay off the core glyph unless intentional
