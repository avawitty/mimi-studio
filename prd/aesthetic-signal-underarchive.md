# Aesthetic accent — Signal Underarchive

**Status**: Spec + light implementation  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Relationship**: Nod only — does not replace editorial-archive House Style v2

---

## Intent

Mimi already carries MKUltra / Rococo / surveillance lore (Dolls, Obsidian Ledger, Oracle). The public face stays a quiet editorial archive. This layer adds a **controlled cold-war signal** so the house doesn’t read as a lifestyle magazine:

- **Monolithic cobalt haze** — the luminous foggy blue of the mimizine.app hero: backlit mist, desaturated cobalt → white-blue glow, vignette edges — not navy institutional panels, not neon cyber
- **Surveillance** — obscured silhouette energy, registry corners, closed-circuit quiet
- **MKUltra Rococo** — gilt whisper + baroque restraint in silhouette/structure (architectural coat, not ornament dump)

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
| `--mimi-cobalt` | `#5A7D9A` | Mid atmospheric cobalt (marks, labels) |
| `--mimi-cobalt-deep` | `#2A4058` | Vignette / depth |
| `--mimi-cobalt-mist` | `#C5D4E2` | Backlit fog highlight |
| `--mimi-cobalt-haze` | `rgba(90, 125, 160, 0.28)` | Fog wash |
| `--mimi-gilt` | `#A89B6E` | Rare rococo whisper (not terracotta) |

Reference mood: silhouetted figure in cobalt fog, centered serif **Mimi**, tagline over haze — high-fashion surveillance atmosphere.

## Motifs

1. **Registry corners** — four L-brackets (CCTV crop / closed-circuit frame)
2. **Cobalt hairline** — replaces olive only on registry/provenance chrome when opted in
3. **Haze field** — radial/edge wash on worktables; never full-bleed cream substitute on public white

## Acceptance

- [ ] Public first viewport still passes brand test (editorial archive first)
- [ ] Cobalt reads institutional/cold, not purple-AI
- [ ] Gilt is rare whisper, not theme fill
- [ ] Oracle/Dolls remain free to be denser
