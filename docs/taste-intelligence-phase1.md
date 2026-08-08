# Taste Intelligence — Phase 1

**Status:** partial (domain layer + first UI surface)  
**Canon types:** `types.ts` (Taste Intelligence section)  
**Verify:** `npm run verify:taste-intelligence`

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

1. **API** — `POST /api/mimi/evidence` (preferred for server-side ingest) → queues analysis when `AI_GATEWAY_API_KEY` is set
2. **Analyze** — `POST /api/mimi/evidence/analyze` `{ atomId }` (session + funded gateway)
3. **Client** — `createEvidenceAtom(userId, input)` → schedules analyze via API
4. **Tailor bridge** — `addEvidenceNode` → `evidenceNodeToAtomInput` → `createEvidenceAtom` (fire-and-forget)

## Generation context

Signed-in requests to these routes receive `TASTE INTELLIGENCE` in the system prompt when taste data exists:

- `POST /api/mimi/generate-text` (optional `tasteContext` in body)
- `POST /api/mimi/create-zine` (optional `tasteContext` in body)

Read path: `GET /api/mimi/taste-state?context=editorial`

## Known debt (Phase 1.5+)

- [ ] Post-ingest analysis hook (`analyze-image` / embed) after atom create
- [x] `GET /api/mimi/taste-state` for server-side generation
- [ ] Pocket mirror (like Tailor bridge)
- [x] Migrate generation routes to inject `tasteStateToPromptContext()`
- [ ] Deprecate duplicate reads from `EvidenceNode` where `EvidenceAtom` supersedes

## Correction loop

User taps a `CorrectionChip` on `EvidenceAtomCard` → `applyInlineCorrection` → updates atom `userReaction` and/or assertion confidence → `recordTasteInteractionEvent`.

`ONLY_HERE` scopes the assertion/atom to the active `contextScope` (default `global`).
