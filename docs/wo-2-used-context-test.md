# WO-2: Used Context end-to-end test

## Automated (local)

```bash
npm run verify:used-context
```

Validates the Scribe → approve → generate → clear tray state machine without Firebase.

## Manual E2E on preview (mimi.you or `*.vercel.app`)

Prerequisites: signed in, trial credits or patron plan, Firestore rules allow zine create.

| Step | Route | Expected |
|------|-------|----------|
| 1 Capture | `/scribe` → Capture | Atom saved; appears in Atomize tab |
| 2 Send | Retrieve or Studio tray | Atom in Used Context (unapproved) |
| 3 Approve | `/studio` | Toggle approve on atom |
| 4 Generate | Studio Submit | Navigates to `/zine/:id`; tray clears approved studio entries |
| 5 Provenance | Zine reveal | Used Context / fragmentsUsed section lists atom |
| 6 Edit | `/the-edit` | Tray can hold separate approved context |
| 7 Share | Copy `/zine/:id` | OG HTML via bot rewrite (see WO-1 audit) |

## WO-1 dependency

Credit debit and zine persistence on Vercel require Functions proxy when `FIREBASE_SERVICE_ACCOUNT` is unset.
