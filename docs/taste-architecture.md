# Taste Intelligence Architecture

How **EvidenceAtom / TasteState** (canonical) relates to **TasteModelSnapshot** (derived) in Mimi Studio.

## Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  UI: EvidenceAtom cards, corrections, Taste Graph, inspector    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  CANONICAL — EvidenceAtom + TasteState + taste assertions       │
│  services/taste/evidenceAtomService.ts                          │
│  services/taste/tasteStateService.ts                            │
│  services/taste/tasteAssertionService.ts                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ adapter / bridge
┌────────────────────────────▼────────────────────────────────────┐
│  CANONICAL (project graph) — EvidenceNode, Observation,         │
│  PatternCluster, CreativeLaw (atom ids via bridge)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ + TasteEventV2 learning events
┌────────────────────────────▼────────────────────────────────────┐
│  DERIVED CACHE — TasteModelSnapshot                             │
│  lib/tasteModel/compileTasteModel.ts                            │
│  services/tasteModelService.ts                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Rules

1. **EvidenceAtom / TasteState** hold canonical evidence and user assertions. They are the source of truth for what was captured, analyzed, corrected, and retrieved semantically.

2. **TasteModelSnapshot** is a deterministic computational cache. It is rebuilt from graph entities + learning events. Never treat snapshot weights as authoritative memory.

3. **No duplicate preference truth stores.** Do not add parallel Firestore collections for “user preferences” outside the atom/assertion/graph/event stack.

4. **One migration boundary:** `lib/taste/evidenceNodeBridge.ts` links legacy `EvidenceNode` rows to `EvidenceAtom` ids; `lib/tasteModel/normalizeTasteEvents.ts` unifies legacy and v2 learning events. New features write atoms first; compilation consumes both until migration completes.

## Compilation scopes

| Trigger | Scope | Snapshots touched |
| --- | --- | --- |
| Tailor curation | `project` | `project-{id}` only |
| Full user rebuild (no project) | `global` | `global` only |
| Explicit dual rebuild | `both` | `global` + `project-{id}` |

## Related docs

- [`computational-taste-model.md`](./computational-taste-model.md) — compiler, events, scoring
- [`taste-intelligence-phase1.md`](./taste-intelligence-phase1.md) — EvidenceAtom intake and analysis
