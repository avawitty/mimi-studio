# Automation: Fix bot PR review comments

Make "check Cursor / Codex / Vercel bot comments and fix them" a recurring background job.

## Recommended: Cursor Automation (event-driven)

Cursor cannot create Automations from this repo via API — activate once in the dashboard.

1. Open [cursor.com/automations/new](https://cursor.com/automations/new)  
   or start from the marketplace template [Autofix PR review comments](https://cursor.com/marketplace/automations/autofix-pr-review-comments).
2. **Repository:** `avawitty/mimi-studio`
3. **Triggers** (enable all that apply):
   - GitHub → **PR review comment**
   - GitHub → **PR review submitted**
   - Optional catch-up: **Scheduled** every 6 hours
4. **Tools:** Comment on pull request (no approve), Memories optional off
5. **Prompt:** paste the block below
6. Save + enable

### Prompt

```
You fix actionable review comments from automation bots on mimi-studio PRs.

## When to act

Only act on comments from: vercel[bot], chatgpt-codex-connector[bot], cursor[bot],
copilot-pull-request-reviewer[bot], or github-actions[bot].

Skip: Vercel deploy status blobs, Bugbot "usage limit reached", 👍-only reactions,
and open-ended product/design questions that need a human.

## Process

1. Read the triggering PR + comment (author, body, path, URL). If this is a scheduled
   run, scan open PRs for unresolved bot review threads and pick the highest-severity
   actionable ones (FIX / P1 / P2 / concrete defect).
2. Checkout the existing PR branch. Do not open a new PR.
3. Make the smallest correct fix. Match existing helpers (e.g. sanitizeFirestoreData,
   resolve env at call time after dotenv in server.ts).
4. Run the smallest relevant verify script if one exists for the area.
5. Commit, push to the same branch, note the fix in the PR body under
   "Bot feedback addressed".
6. Resolve the review thread when fully addressed. Reply only if you cannot fix
   confidently — say why.

## Rules

- Do not merge. Do not approve the PR. Do not change production env/domains.
- Never commit secrets. Prefer one focused commit per finding cluster.
- Follow AGENTS.md and .cursor/skills/fix-bot-pr-comments/SKILL.md.
```

## Backup: GitHub Action + Cursor SDK

Workflow: `.github/workflows/fix-bot-pr-comments.yml`  
Script: `npm run cursor:fix-bot-comments`

Requires repo secret `CURSOR_API_KEY` (from [Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents)). Without it the workflow no-ops.

Triggered on `pull_request_review_comment` / `pull_request_review` from the bot allowlist, plus `workflow_dispatch` for a manual sweep.
