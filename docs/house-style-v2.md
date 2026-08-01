# House Style v2 — Print-Shop Discipline

Source of truth for aesthetic tokens and anti-drift rules. Specs: `prd/aesthetic-01-house-style.md`, `prd/aesthetic-07-public-face.md`.

## Wordmark

- Product name: **`Mimi`** (title case) in Cormorant Garamond.
- Never render brand as all-caps `MIMI` on public plates, entry compositions, Signature, Stand, or share cards.
- Tracked uppercase is OK for system chrome only (`COLOPHON`, `ISSUE`, `FOLIO`).

## Surfaces

Use `data-surface="public"` on Front Page, Share, Signature, Stand, and public share routes.

| Token | Public | Worktable |
|-------|--------|-----------|
| Field | `--mimi-field` `#FFFFFF` | `--mimi-worktable` `#FAFAFA` |
| Ink | `--mimi-ink` `#0A0A0A` | same |
| Olive | `--mimi-olive` `#5A5A40` | folio / press only |
| Stone | `--mimi-stone` `#78716C` | metadata |
| Hairline | `--mimi-hairline` `#D4D4D4` | column rules |
| Grain | cool tooth ≤12% opacity | optional |

## Anti-drift checklist

- [ ] Brand test without nav still reads as Mimi
- [ ] Wordmark is `Mimi`, not `MIMI`
- [ ] No large warm-cream panel as primary public field
- [ ] No terracotta / purple / glow on public face
- [ ] Olive is accent mark only, not theme fill
- [ ] Cards avoided unless needed for interaction

## Oracle

Oracle keeps its denser tone. Do not force the quiet public kit onto Oracle.
