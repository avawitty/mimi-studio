# Aesthetic accent — Signal Underarchive

**Status**: Spec + light implementation  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Relationship**: Nod only — does not replace editorial-archive House Style v2

---

## Intent

Mimi already carries MKUltra / Rococo / surveillance lore (Dolls, Obsidian Ledger, Oracle). The public face stays a quiet editorial archive. This layer adds a **controlled cold-war signal** so the house doesn’t read as a lifestyle magazine:

- **Light cobalt haze** — pale luminous blue mist (`#9BB8CE` → `#E8F0F6`), airy and backlit — not navy, not neon
- **Art deco feminine** — slender silhouettes, soft geometry, fan/stepped deco marks, gilt whisper; elegance over brutal monolith
- **Surveillance** — quiet registry corners, obscured glamour, closed-circuit as mood not HUD

Oracle and Dolls may go denser; public plates get a whisper.

## Where it may appear

| Surface | Allowance |
|---------|-----------|
| Oracle, Dolls, Obsidian Ledger | Full signal language OK |
| Studio / Darkroom / Moodboard (worktables) | Cobalt haze vignette, registry corners, cobalt hairlines |
| Used Context colophon | Cobalt accent on mark; “Registry” microcopy OK |
| Signature / Stand / Front Page | Whisper only: corner brackets, one cobalt hairline, no haze wash |
| Share cards | Corner brackets max |

## Where it must not appear

- Purple glow / acid cyberdeck on public face
- Warm cream + terracotta “AI editorial”
- Full rococo ornament dumping on first viewports
- Copy that claims Mimi is a print shop

## Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--mimi-cobalt` | `#9BB8CE` | Light atmospheric blue |
| `--mimi-cobalt-deep` | `#6A8AA4` | Soft depth |
| `--mimi-cobalt-mist` | `#E8F0F6` | Pale fog highlight |
| `--mimi-cobalt-haze` | `rgba(155, 184, 206, 0.38)` | Airy fog wash |
| `--mimi-gilt` | `#C4B08A` | Art-deco feminine whisper |

Reference mood: art-deco feminine silhouette in **light** cobalt mist, serif **Mimi**, soft gilt deco fan — glamorous, atmospheric, not institutional navy.

## Motifs

1. **Registry corners** — four L-brackets (CCTV crop / closed-circuit frame)
2. **Cobalt hairline** — replaces olive only on registry/provenance chrome when opted in
3. **Haze field** — radial/edge wash on worktables; never full-bleed cream substitute on public white

## Acceptance

- [x] Public first viewport still passes brand test (editorial archive first)
- [x] Cobalt reads **light atmospheric blue**, not navy / purple-AI
- [x] Gilt + deco fan are rare feminine whispers, not theme fill
- [x] Oracle/Dolls remain free to be denser
