# MIMI RESIDUE ENGINE — Phase 2 Status

**Status:** Complete  
**Date:** 2026-07-29  
**Depends on:** [Phase 1 audit](./residue-engine-phase1-audit.md)

## Delivered

Shared Residue foundation under `services/residue/`:

| Area | Files |
| --- | --- |
| Constants / layers | `constants.ts` |
| Zod contracts | `validation.ts`, `cultural/culturalResidueSchema.ts`, `emotional/emotionalResidueSchema.ts` |
| Scoring | `scoring.ts` (coverage, diversity, countersignals, literal mean/median/mode) |
| Uncertainty / safety | `uncertainty.ts`, `emotional/emotionalSafety.ts` |
| Provenance | `provenance.ts`, `shared/buildUsedContext.ts`, `shared/buildSourceManifest.ts` |
| Storage | `storage/residueStore.ts` (+ in-memory test store) |
| Acquisition | `SourceAcquisitionProvider`, manual provider, Apify **disabled stub**, actor registry |
| Public API | `index.ts` |
| Verify | `scripts/verifyResidueEngine.ts` → `npm run verify:residue` |

Also updated: `.env.example` (`APIFY_TOKEN` docs), `firestore.rules` (explicit residue collections), `package.json` script.

## Decisions

1. Zod is the runtime source of truth for Residue contracts.
2. Evidence layers A–D are first-class on evidence records and confidence summaries.
3. Confidence copy must state it is **not** diagnostic likelihood.
4. Emotional inputs default to `retention: temporary` and are redacted in stored run labels when sensitive.
5. Artifact deletion does not delete the research run.
6. Apify remains optional; stub returns `disabled` until Phase 9 live client.
7. No cultural/emotional AI pipeline yet (Phases 3–4).

## Commands run

```bash
npm install
npm run verify:residue
```

## Tests passed

`npm run verify:residue` — schemas, scoring, provenance disclosure, emotional language safety, redaction, acquisition stubs, memory store retention/artifact isolation, literal MMM helpers.

## Known limitations

- No staged AI pipeline / model calls yet.
- No UI, adapters, or API routes yet.
- Firestore CRUD helpers exist but are not exercised against a live Firebase project in the verify script (in-memory store covers contracts).
- Apify stub does not call Actors even if `APIFY_TOKEN` is present.
- Cultural/emotional “engines” are schema modules only.

## Next phase

**Phase 3 — Cultural Residue engine** (normalize → extract → associations → lineage → countersignals → confidence → synthesis), using these contracts.
