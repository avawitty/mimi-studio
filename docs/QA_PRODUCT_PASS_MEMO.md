# QA Product Pass Memo — Friends, Cliques, Signature, Moodboard, Evidence Intake

**Date:** 2026-07-29  
**Branch context:** `me-qa-pass-bf71`  
**Scope:** Planning notes for items that need product direction before heavy build; paired with shipped UI fixes in the same pass.

---

## 7. Friends adding & Cliques — planning

### What exists today
- `ConnectionsManager` + `services/connections.ts` — follow graph.
- `CliqueView` / `CliqueProtocol` / `CliqueRadar` — early clique surfaces (partially wired).
- Stand / Nebula can load a “network” of followed profiles’ zines.

### Product shape (recommended)
Treat social as **three concentric rings**, not a Facebook clone:

| Ring | Name | Purpose | Trust |
|------|------|---------|-------|
| 1 | **Follow** | Soft signal — see their Stand on Floor | Public |
| 2 | **Clique** | Small private circle (3–12) for shared moodboards, critique, co-edit | Invite |
| 3 | **Collab seat** | Explicit project membership (Tailor / Studio brief) | Contractual |

### Build order
1. **Follow + Stand visibility** — “Follow” from profile share card; Floor shows followed stands.
2. **Clique as named shelf** — create clique → invite by handle → shared Pocket folder + shared moodboard page.
3. **Activity without feed addiction** — weekly “Clique digest” (new issues, new evidence), not infinite scroll chat.
4. Defer DMs; use Oracle Chamber Synthesis for shared critique sessions instead.

### Risks
- Clique without privacy model will leak Tailor evidence.
- Don’t mix “friends” language with Mimi’s archival tone — prefer **Correspondents / Clique / Circle**.

---

## 8. Profile API keys — keep or remove?

### Argument to remove (or bury)
- Product path is now **server AI Gateway** (`/api/mimi-image`, server Gemini). Asking every user for keys is friction and looks unfinished.
- Keys in localStorage are a support burden and a phishing surface.
- Share-card / public profile should never sit next to credential UI.

### Argument to keep (power users)
- BYOK is a sovereignty story that matches the manifesto.
- Useful when Gateway quota is exhausted (the Tailor simulated-mode case).
- Agency / multi-client operators may need separate keys per persona.

### Decision for this pass
- **Default UI:** Share Card first; keys live under **Settings** only.
- **Copy:** Gateway is primary; BYOK optional.
- Long-term: remove Gemini key gate from app boot (`ApiKeyShield`) once Gateway is always provisioned in prod.

---

## 9. Moodboard — keep or kill?

### Current pain
- Mobile splits viewport (~42% tools / 55% canvas); action bar overflows.
- Pointer-first drag; limited touch.
- MoodboardComposer is a second full-screen paradigm.

### Ideal (your brief)
Infinite canvas · multiple pages · select items · **bulk synthesis**.

### Recommendation
**Do not kill yet.** Collapse to one chamber with:

1. Full-bleed canvas on mobile; tools in a bottom sheet.
2. **Pages** (tab strip) instead of one flat board.
3. Multi-select → “Synthesize selection” → Studio / Tailor evidence / Oracle Chamber notes.
4. Deprecate MoodboardComposer once Chamber supports pan/zoom + pages.

Shipped interim: taller canvas, white grid, shorter tool strip on mobile.

---

## 10. Signature — layout & shareability ideas

Signature is one of the strongest identity artifacts. Treat it like a **collectible plate**, not a dashboard dump.

### Layout directions
1. **Hero DNA card** (full-bleed, exportable) — axes, mood cluster, motifs, handle watermark.
2. **Secondary strip** — trajectory chart + influence lineage (collapse by default on mobile).
3. **Share actions** — PNG / story 9:16 / link to `/u/:handle/signature`.
4. Future **ad slot**: quiet sponsored plate under “Influence Lineage” with editorial labeling — only after the card feels precious.

### Share card stack
Profile Share Card → Signature plate → Stand issue grid. Same visual language (white, column rules, serif name).

---

## 11. Evidence intake — where we left off

### Status
First-module intake **already exists** under Tailor project flow, not buried in `TailorView.tsx` monolith:

| Surface | Path |
|---------|------|
| Upload UI | `components/tailor/EvidenceUploadScreen.tsx` |
| Wiring | `components/tailor/TailorProjectFlow.tsx` |
| Hub dossier | `EvidenceDossierFlow` / `EvidenceLibraryView` |
| Importers | `services/tasteImportService.ts` |
| APIs | `/api/letterboxd` (RSS), `/api/pinterest` |

### Tabs in EvidenceUploadScreen
1. **Paste link** — Letterboxd RSS, Pinterest board, Instagram URL, generic.
2. **Instagram / algo screenshot** — upload + `screenshotProvenance`.
3. **Upload** — arbitrary files into evidence nodes.

### Gaps / leftover work
- Letterboxd + Pinterest success depends on server fetchers + CORS; failures feel like “feature missing.”
- Algo screenshot → pattern graph handoff is partial (confidence labels exist; bulk “approve into Tailor profile” needs a clearer CTA).

### Shipped next module step (this branch)
- **Evidence Intake is Tailor step 0** — `/tailor` redirects to `/tailor/evidence`; hub tabs reorder Intake first.
- **Add evidence** on Profile Share Card and Studio Used Context tray.
- Moodboard **pages** + multi-select **bulk synthesize** → Studio / Tailor / Oracle.
- Signature **Plate PNG**, **Story 9:16**, and share **link**.
- Clique **rings**: Follow → Clique → Collab seat.
- Stand Bugbot fixes: `stand` canon route, progressive local load, Firestore error unblocks UI, comments modal overlay, no double page pad.

---

## Shipped in this pass (code)
1. Image gen prefers `/api/mimi-image` (Gateway); honest failure copy; Tailor doll no longer forces Gemini + fake picsum success.
2. Scry → white full-height line grid.
3. Header: chrome safe-area, no overflow clip; `mimi-page-pad` on non-studio mains.
4. Brown noise opt-in toggle in Studio (default off).
5. Oracle Chamber cyberdeck (Mimi Archivist / Cyrus Oracle / Synthesis); GEO tab removed; notepad replaced by auto chamber notes; glyph ring keeps scribble.
6. The Stand restored as personal zine showcase (`viewMode: stand`).
8. Profile Share Card vs Settings split; keys demoted.
9. Moodboard mobile canvas breathing room.
