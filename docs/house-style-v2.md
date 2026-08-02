# House Style v2 — Editorial Archive Discipline

Source of truth for aesthetic tokens and anti-drift rules. Specs: `prd/aesthetic-01-house-style.md`, `prd/aesthetic-07-public-face.md`.

**Product note:** Mimi is a private AI editorial studio for taste, identity, and image-making — not a print shop or print studio. Visual cues (column rules, quiet provenance, high-contrast type) are archival/editorial, not a claim that Mimi produces physical print.

## Wordmark

- Product name: **`Mimi`** (title case) in Cormorant Garamond.
- Never render brand as all-caps `MIMI` on public plates, entry compositions, Signature, Stand, or share cards.
- Tracked uppercase is OK for system chrome only (`COLOPHON`, `ISSUE`, `MARK`).

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
| Cobalt | `--mimi-cobalt` `#9BB8CE` | light atmospheric blue |
| Cobalt deep | `--mimi-cobalt-deep` `#6A8AA4` | soft depth (not navy) |
| Cobalt mist | `--mimi-cobalt-mist` `#E8F0F6` | pale luminous fog |
| Cobalt haze | `--mimi-cobalt-haze` | airy fog wash |
| Gilt | `--mimi-gilt` `#C4B08A` | art-deco feminine whisper |

## Signal Underarchive (nod)

Controlled MKUltra / surveillance / monolithic cobalt / rococo whisper — see `prd/aesthetic-signal-underarchive.md`.

- Public face: registry corners + cobalt mark + gilt hairline only
- Worktables: soft cobalt haze vignette OK
- Oracle / Dolls: full denser language remains theirs
- Never purple glow or cream/terracotta lifestyle fill

## Anti-drift checklist

- [ ] Brand test without nav still reads as Mimi
- [ ] Wordmark is `Mimi`, not `MIMI`
- [ ] No large warm-cream panel as primary public field
- [ ] No terracotta / purple / glow on public face
- [ ] Olive / cobalt are accents only, not theme fills
- [ ] Cards avoided unless needed for interaction
- [ ] Signal Underarchive stays a nod, not a full cyberdeck reskin

## Oracle

Oracle keeps its denser tone. Do not force the quiet public kit onto Oracle.
