# Aesthetic accent — Signal Underarchive

**Status**: Spec + light implementation  
**Parent**: [`aesthetic-system-overview.md`](./aesthetic-system-overview.md)  
**Relationship**: Nod only — does not replace editorial-archive House Style v2

---

## Intent

House Style v2 stays primary: black / white / olive / stone, ticket-like Signature plates, quiet colophon.

Signal Underarchive is a **fun surveillance nod**, not a second theme:

1. **Light blue Accent C** (`#9BB8CE`) — peer to olive on marks, dots, registry stamps; never a foggy hero wash on public plates
2. **Spy × Manila folder** — dossier tabs, “Filed / Restricted” classification marks, Captive Sentinel field-report motif (`CaptiveSentinel`, `KeepTabsButton`, colophon tab)
3. **Optional gilt / deco whisper** — rare fan ornaments where already present

Oracle and Dolls may go denser; public plates stay editorial.

## Where it may appear

| Surface | Allowance |
|---------|-----------|
| Captive Sentinel, Keep Tabs | Full manila folder language + light-blue stamps |
| Used Context colophon | Soft dossier tab + light-blue “Filed” mark |
| Signature plate | Manila tab whisper + light-blue geometry accent; olive remains primary |
| Front Page / Stand | Light-blue accent dots / PressMark only — no cobalt field wash |
| Studio / Darkroom tools chrome | Tiny light-blue accent on sheet labels |
| Oracle, Dolls, Obsidian Ledger | Full denser signal language OK |

## Where it must not appear

- Cobalt / light-blue as full-bleed public hero fields
- Manila cream as the primary Front Page / Signature / Stand field
- Purple glow / acid cyberdeck on public face
- Warm cream + terracotta “AI editorial”
- Copy that claims Mimi is a print shop

## Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--mimi-cobalt` | `#9BB8CE` | Accent C — light blue |
| `--mimi-cobalt-deep` | `#6A8AA4` | Accent C text/depth |
| `--mimi-manila-tab` | `#E8DCB5` | Folder tab |
| `--mimi-manila-body` | `#F0E6C8` | Folder body |
| `--mimi-manila-edge` | `#C9BA86` | Folder edge |
| `--mimi-manila-sheet` | `#F7F3E8` | Inner document sheet |
| `--mimi-manila-ink` | `#5C5334` | Folder label ink |
| `--mimi-gilt` | `#C4B08A` | Rare deco whisper |

## Motifs

1. **Dossier tab** — `DossierTab` (`Mimi // Filed` style)
2. **Classification stamp** — light-blue bordered Restricted / Filed / Registry
3. **Ticket notches** — Signature collectible plate corners
4. **Olive + light-blue geometry** — olive primary, blue secondary accent

## Acceptance

- [x] Public first viewport still passes brand test (editorial archive first)
- [x] Light blue reads as palette accent, not navy fog theme
- [x] Manila folder appears as spy nod (Captive Sentinel / colophon / Keep Tabs), not lifestyle cream fill
- [x] Olive remains the primary mark accent on Signature
- [x] Oracle/Dolls remain free to be denser
