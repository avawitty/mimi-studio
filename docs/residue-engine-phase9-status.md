# MIMI RESIDUE ENGINE — Phase 9 Status

**Status:** Complete (live Apify acquisition, token-gated)  
**Date:** 2026-08-02  
**PR:** #122

## Delivered

- Live `ApifySourceAcquisitionProvider` via `apify-client` + `apify/rag-web-browser`
- Injectable client for offline verify (no network in CI)
- `mapApifyDatasetItemsToAcquiredSources` — optional-field mapping only
- `acquireResidueSources` compose helper (manual + optional Apify)
- Engines accept `useApify` / `apifyProvider`
- `GET|POST /api/residue-acquire` (availability + signed-in live acquire)
- Residue chamber toggle (disabled when token absent)
- Emotional mode never forwards raw experience text to Apify

## Constraints preserved

- Core engine does not import `apify-client` (adapter only)
- Missing `APIFY_TOKEN` → honest `disabled` status; offline path still works
- Billable Apify requires signed-in session + per-uid hourly quota
- No Actor output-schema generation beyond consumer mapping of observed fields

## Commands

```bash
npm run verify:residue
npm run validate:canon
```

## Env

```bash
APIFY_TOKEN=
# optional
RESIDUE_APIFY_ACTOR_ID=apify/rag-web-browser
APIFY_WAIT_SECS=35
APIFY_SCRAPING_TOOL=raw-http
```

## Next

**Phase 10 — Broader tests/docs/migration polish**
