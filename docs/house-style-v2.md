# House Style v2 — Editorial Archive Discipline

Source of truth for aesthetic tokens and anti-drift rules. Specs: `prd/aesthetic-01-house-style.md`, `prd/aesthetic-07-public-face.md`.

**Product note:** Mimi is a private AI editorial studio for taste, identity, and image-making — not a print shop or print studio. Visual cues (column rules, quiet provenance, high-contrast type) are archival/editorial, not a claim that Mimi produces physical print.

## Wordmark

- Product name: **`Mimi`** (title case) in Cormorant Garamond.
- Never render brand as all-caps `MIMI` on public plates, entry compositions, Signature, Stand, or share cards.
- Tracked uppercase is OK for system chrome only (`COLOPHON`, `ISSUE`, `MARK`).
- App icon / favicon use a cropped **`mi`** mark (not a second spelling) — see [`brand-assets.md`](./brand-assets.md).

## Surfaces

Use `data-surface="public"` on Front Page, Share, Signature, Stand, and public share routes.

| Token | Public | Worktable |
|-------|--------|-----------|
| Field | `--mimi-field` `#FFFFFF` | `--mimi-worktable` `#FAFAFA` |
| Ink | `--mimi-ink` `#0A0A0A` | same |
| Olive | `--mimi-olive` `#5A5A40` | folio / press primary accent |
| Stone | `--mimi-stone` `#78716C` | metadata |
| Hairline | `--mimi-hairline` `#D4D4D4` | column rules |
| Light blue | `--mimi-cobalt` `#9BB8CE` | Accent C — marks / stamps only |
| Grain | cool tooth ≤12% opacity | optional |

## Accent map

1. **Olive** — primary mark / diamond / press accent  
2. **Stone** — metadata  
3. **Light blue** — secondary accent (registry, Filed stamps, geometry dots)  
4. **Manila folder** — spy motif on Captive Sentinel, Keep Tabs, colophon tab — see `prd/aesthetic-signal-underarchive.md`

## Signal Underarchive (nod)

- House style first; manila + light blue are **nods**, not a reskin
- Signature: ticket notches, olive geometry, light-blue secondary, soft dossier tab
- Never purple glow or cream/terracotta lifestyle fill on public plates

## Anti-drift checklist

- [ ] Brand test without nav still reads as Mimi
- [ ] Wordmark is `Mimi`, not `MIMI`
- [ ] No large warm-cream panel as primary public field
- [ ] No terracotta / purple / glow on public face
- [ ] Olive / light blue are accents only, not theme fills
- [ ] Manila folder stays on dossier surfaces (not Front Page hero)
- [ ] Cards avoided unless needed for interaction

## Oracle

Oracle keeps its denser tone. Do not force the quiet public kit onto Oracle.
