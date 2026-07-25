# Core Loop Demo Script (M2 Preview)

Five-step checklist for the north star demo:

**Save fragment in Scribe → approve Used Context in Studio → generate zine → editorial read in The Edit → export from Press.**

Run automated service check first:

```bash
npm run verify:used-context   # expect PASS
npm run validate:canon        # expect all chambers OK
npm run build                 # expect clean build
```

## 1. Scribe — Save fragment

- [ ] Open `/scribe` (Retrieve tab is default home)
- [ ] Switch to **Capture**, paste a short fragment (dialogue, link, or decision)
- [ ] Click **Save Memory Atom** — confirm atom appears under **Atomize** / Retrieve search
- [ ] Optional: verify atom mirrored to **Pocket** as text shard

## 2. Studio — Approve Used Context

- [ ] From Scribe Retrieve, **Send to Studio** on the saved atom
- [ ] Open `/studio` → Continuum **Used Context** tray
- [ ] Approve the atom (checkbox or **Approve all**)
- [ ] Optional: compose a cover plate (Compose + overlay layers)

## 3. Studio — Generate zine

- [ ] Enter a brief prompt and submit generation
- [ ] Confirm redirect to `/zine/:id` reveal view
- [ ] Verify **Used Context** section lists approved atom(s)
- [ ] Verify `fragmentsUsed` / cover image present when cover was composed

## 4. The Edit — Editorial compile

- [ ] From Scribe Retrieve, also **Send to Edit** (or queue same atom to `the-edit` target)
- [ ] Open `/the-edit` — **Editorial compile** tab (book icon in spine)
- [ ] Approve atom in Used Context tray if not already approved
- [ ] Add thesis / lead, confirm markdown preview updates
- [ ] Copy markdown or click **The Press**

## 5. Press — Export

- [ ] Open `/the-press` → Export manifest tab
- [ ] From zine reveal, run export (PDF / assets / manifest pack)
- [ ] Confirm manifest includes `fragmentsUsed`, `usedContextSnapshots`, `editorialCompileMarkdown`, and cover diagnostic when applicable
- [ ] Confirm asset ZIP includes `editorial-compile.md` when The Edit compile was used
- [ ] Optional: validate OG share preview at `/zine/:id` (Twitter/Facebook debugger)

## Known gaps (post Phase 2 tail)

- Preview E2E requires signed-in pass with working Gemini key (see preview E2E notes)
- Mimi Dolls richer companion / identity injection — Phase 3
- Full narrative thread graph data in Scribe 3JS scene — optional depth
