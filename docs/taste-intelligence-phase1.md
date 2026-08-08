# Taste Intelligence — Phase 1

**Status:** partial (domain layer + first UI surface)  
**Canon types:** `types.ts` (Taste Intelligence section)  
**Verify:** `npm run verify:taste-intelligence`

## Architecture boundary

See [`taste-architecture.md`](./taste-architecture.md): **EvidenceAtom / TasteState** are canonical; **TasteModelSnapshot** (#224) is a derived computational cache. No duplicate preference truth stores.

## Phase 1.5 security

- Server-side image fetch for vision analysis uses `lib/trustedStorageFetch.ts` (HTTPS allowlist + SSRF block).
- Analysis runs only via funded `POST /api/mimi/evidence/analyze` (credit accounting through `resolveRouteGatewayKey`).

## What shipped

| Layer | Path | Notes |
| --- | --- | --- |
| Types | `types.ts` | `EvidenceAtom`, `TasteAssertion`, `TasteConcept`, `TasteState` |
| Schemas | `lib/taste/evidenceAtomSchema.ts` | Zod validation shared by API + client |
| Builder | `lib/taste/buildEvidenceAtom.ts` | Single atom construction path |
| Logic | `lib/taste/tasteStateLogic.ts` | Confidence cap, scoring, partitioning |
| Services | `services/taste/*` | CRUD, corrections, `getTasteState()` |
| API | `POST /api/mimi/evidence` | Session auth + rate limit |
| UI | `components/taste/*` | `EvidenceAtomCard`, `CorrectionChip`, `TasteEvidenceAtomsPanel` |
| Chamber | `/taste-graph` Intel Memo | Evidence atoms + correction loop |

## Firestore layout

```
users/{uid}/
  evidenceAtoms/{id}      # canonical taste evidence
  tasteAssertions/{id}    # directional preference edges
  tasteConcepts/{id}      # named concept vocabulary
  interactionEvents/{id}  # correction audit trail
```

Existing collections **remain** in Phase 1:

| Legacy | Purpose | Phase 1 behavior |
| --- | --- | --- |
| `users/{uid}/tasteGraphNodes` | Orbital graph UI | Unchanged |
| Tailor `evidenceNodes` (per project) | Project-scoped intake | Mirrored → `evidenceAtoms` on create |
| Neon memory atoms | Approved Scribe memory | Separate — not taste evidence |

## Invariants

1. **`originalSource` is write-once** — AI interpretation lives in `semanticDescription` / `observationIds`.
2. **Inferred assertions cap at 0.7 confidence** — see `capAssertionConfidence`.
3. **Corrections outweigh weak inference** — `applyInlineCorrection` updates target + writes `interactionEvents`.
4. **`getTasteState()` is computed** — generation must not rebuild taste from scratch.

## Ingest paths

1. **API** — `POST /api/mimi/evidence` (preferred for server-side ingest)
2. **Analyze** — `POST /api/mimi/evidence/analyze` `{ atomId }` (session + funded gateway)
3. **Client** — `createEvidenceAtom(userId, input)` → schedules analyze via API
4. **Tailor bridge** — `addEvidenceNode` → `evidenceNodeToAtomInput` → `createEvidenceAtom` (fire-and-forget)
5. **Pocket bridge** — `addToPocket` → `pocketItemToAtomInput` → `createEvidenceAtom` (fire-and-forget)

## Generation context

Signed-in requests to these routes receive `TASTE INTELLIGENCE` in the system prompt when taste data exists:

- `POST /api/mimi/generate-text` (optional `tasteContext` in body)
- `POST /api/mimi/create-zine` (optional `tasteContext` in body)
- `POST /api/mimi/synthesize-dossier` (optional `tasteContext` in body)
- Studio zine bake (`createZine` + `bakeZineVisualPlates`) — fetches `GET /api/mimi/taste-state` client-side

Read path: `GET /api/mimi/taste-state?context=editorial`

## Embeddings

After interpretation via the funded analyze route, `runEvidenceAtomAnalysis` embeds `semanticDescription` (or `originalSource` fallback) via AI Gateway and stores the vector at:

```
users/{uid}/evidenceAtomEmbeddings/{atomId}
```

The atom's `embeddingRef` field stores the stable path `users/{uid}/evidenceAtomEmbeddings/{atomId}`.

## Known debt (Phase 2+)

- [x] Post-ingest analysis hook after atom create (client `scheduleEvidenceAtomAnalysis`)
- [x] `GET /api/mimi/taste-state` for server-side generation
- [x] Pocket mirror (like Tailor bridge)
- [x] Embedding refs on atoms after analysis
- [x] Taste context in zine bake + dossier synthesis routes
- [x] Migrate generation routes to inject `tasteStateToPromptContext()`
- [ ] Deprecate duplicate reads from `EvidenceNode` where `EvidenceAtom` supersedes
- [ ] Semantic retrieval using `embeddingRef` in generation / Floor search

## Correction loop

User taps a `CorrectionChip` on `EvidenceAtomCard` → `applyInlineCorrection` → updates atom `userReaction` and/or assertion confidence → `recordTasteInteractionEvent`.

`ONLY_HERE` scopes the assertion/atom to the active `contextScope` (default `global`).
