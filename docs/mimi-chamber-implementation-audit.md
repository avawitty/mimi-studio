# Mimi Chamber Implementation Audit

Date: 2026-07-11 (Milestone 2 + Phase 2 tail complete)

Source of truth: product canon + `lib/productCanon.ts`. Every canonical chamber has a dedicated route mode, chamber shell (where applicable), and `CanonModule` registry.

## Milestone 1 Status: Complete

All 18 canonical modules are registered. Chamber shells live under `components/chambers/`.

| Canon chamber | Route | Component | Status |
| --- | --- | --- | --- |
| Studio / Worktable | `/studio` | `InputStudio` | Live |
| Scribe / Semantic Portal | `/scribe` | `ScribeChamber` | Live |
| Tailor / Profile Logic | `/tailor` | `TailorHub` | Live |
| Taste Signature | `/signature` | `SignatureView` | Live (artifact) |
| Taste Graph / Threads | `/taste-graph` | `TasteGraph` | Live |
| The Edit | `/the-edit` | `TheEditChamber` | Live |
| The Press / Export | `/the-press` | `ThePressChamber` + `ExportChamber` | Live |
| Pocket / Registry | `/pocket` | `Pocket` | Live |
| Mood Board | `/moodboard` | `MoodBoardChamber` | Live |
| IntelHub | `/intelhub` | `IntelHub` | Live |
| GeoEngine | `/geoengine` | `TheGEOEngine` | Live |
| Darkroom | `/darkroom` | `DarkroomView` | Live |
| Wardrobe | `/wardrobe` | `WardrobeView` | Live |
| Thimble | `/thimble` | `ThimbleDashboard` | Live |
| Sanctuary | `/sanctuary` | `SanctuaryView` | Live |
| The Ward | `/ward` | `TheWard` | Live |
| Private Studio | `/private-studio` | `PrivateStudioChamber` | Live |
| Mimi Dolls | `/mimi-dolls` | `MimiDollsChamber` | Live |
| Atelier | `/atelier` | `AtelierChamber` | Live |

## Legacy Route Aliases (preserved)

| Legacy | Canonical mode |
| --- | --- |
| `/research-memory` | `scribe` |
| `/threads`, `/narrative-threads` | `scribe` (Threads tab) |
| `/press`, `/edit` | `the-edit` |
| `/publisher` | `the-press` |
| `/dossier` | `moodboard` |
| `/case-study` | `private-studio` |
| `/stand`, `/registry` | `pocket` |
| `/mimi-you` | `mimi-dolls` |
| `/objects`, `/taste-objects` | `atelier` |

Public doll cards remain at `/u/:handle` (infrastructure route, not chamber replacement).

Atelier is distinct from the Atelier membership plan: it archives taste-signal objects pinned from zine commerce touchpoints.

## Chamber Map

Navigate to `/chamber-map` or **Intelligence → Chamber Map** to inspect the live registry and open any chamber.

## Validation

```bash
npm run validate:canon
npm run verify:used-context
npm run verify:atelier
npm run build
```

## Milestone 2 (Core Loop) — Complete

Capture → Parse → Save → Read → Approve → Apply → Export

North star demo: **Scribe → Studio Used Context → generate zine → The Edit compile → Press export**

| Step | Implementation | Status |
|------|----------------|--------|
| Capture | Scribe Capture tab + global selection capture | Done |
| Parse | `suggestTitleForAtom` on save | Done |
| Save | `memoryService` Firestore atoms + Pocket mirror | Done |
| Read | Scribe Retrieve tab (default home, embedded `ResearchMemory`) | Done |
| Approve | `UsedContextTray` in Studio Continuum + The Edit compile | Done |
| Apply | Approved atoms in `createZine` prompt + `fragmentsUsed` metadata | Done |
| Studio cover | Composed cover URL + overlay layers baked at save/export | Done |
| Editorial read | `TheEditCompile` — thesis, fragment assembly, markdown preview | Done |
| Edit → Press | Auto-sync compile markdown → manifest + `editorial-compile.md` | Done |
| Export / Read back | `AnalysisDisplay` Used Context + Press export packs | Done |

Key files: `services/usedContextService.ts`, `components/UsedContextTray.tsx`, `components/TheEditCompile.tsx`, `lib/editCompileExport.ts`, `lib/studioCoverExport.ts`, `lib/rasterizeStudioCover.ts`, `services/exportManifestService.ts`, `components/ExportChamber.tsx`.

### verify:used-context (2026-07-11)

```bash
npm run verify:used-context
# WO-2 Used Context service verification: PASS
```

Manual E2E on signed-in preview still recommended (see `docs/DEMO_SCRIPT.md`).

## Phase 2 — Complete

| Item | Implementation | Status |
|------|----------------|--------|
| Scribe 3JS threads | `ScribeThreadScene`, `ScribeThreadsPanel`, Threads tab in `ScribeChamber`; `/threads` + `/narrative-threads` alias to Scribe | Done |
| Mimi Dolls v2 | `DollGalleryCard`, `DollPortraitStage`, `DollPortraitScene`; 2-col gallery in `MimiYouHub` | Done (gallery + portrait stage; richer companion deferred) |
| Edit → Press handoff | `lib/editCompileExport.ts` syncs compile markdown; attached to `export-manifest.json` + zine metadata | Done |
| Cover overlay export | `lib/rasterizeStudioCover.ts` bakes layers at zine save + asset ZIP export; overlay JSON retained in `content.meta.studioCoverOverlays` for reconstruction | Done |

### Remaining polish (not blocking M2 demo)

1. **Pocket shared persistence contract** — atom mirror works; cross-chamber sync polish remains
2. **Mimi Dolls companion depth** — Phase 3 engine landed (`services/dollEngine`): procedural dresser bound to Firestore Doll, multi-view identity pack, default Masks, Studio mask select + prompt injection, Scribe `doll_identity` retrieval, public showcase portrait coherence. Remaining: multimodal image-ref attachment into zine media pipeline when refs are remote-only URLs.
3. **Full narrative thread data in 3JS scene** — orbital UI live; deep graph data wiring optional

## Milestone 3 (Memory Loop) — Complete

Ask → Atomize → Retrieve → Show Used Context

| Step | Implementation |
|------|----------------|
| Ask | Scribe **Ask** tab (`ScribeAskPanel`) queries atoms via `askScribeMemory` |
| Save Answer | `saveAskAnswerAsAtom` + optional Queue Studio |
| Highlight | `SelectionMemoryCapture` → atomize + **Queue for Studio** |
| Atomize | Capture / Atomize tabs + Pocket mirror (`mirrorAtomToPocket`) |
| Retrieve | `ResearchMemory` retrieve mode — search, bulk send, Send to Edit |
| Approve | `UsedContextTray` in Studio (Continuum) and The Edit |
| Apply | Studio generation + `usedContextSnapshots` on zine metadata |
| Show / Export | `AnalysisDisplay` + `export-manifest.json` / `editorial-compile.md` / `used-context.json` in Press packs |
