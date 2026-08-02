---
name: fix-bot-pr-comments
description: Sweep open PRs for actionable Cursor/Codex/Vercel bot review comments, fix them on the PR branch, push, and resolve threads. Use when asked to check bot comments, address Vercel/Codex/Cursor review feedback, or autofix PR bot findings.
---

# Fix bot PR comments

## Trigger

Actionable inline or review feedback from automation bots on open PRs — especially `vercel[bot]`, `chatgpt-codex-connector[bot]`, and `cursor[bot]` — or a request to "check bot comments and fix things".

## Scope

- Default: all open PRs on the current repo (draft + ready). Prefer recent agent/`me*` branches when the user names one.
- Bots to prioritize: `vercel`, `chatgpt-codex-connector`, `cursor`, `copilot`, `github-actions`.
- Skip non-actionable noise: deploy status blobs, Bugbot "usage limit reached", pure 👍 reactions, unanswered design questions.

## Workflow

1. List open PRs (`gh pr list --state open`).
2. For each PR, fetch review comments, issue comments, and reviews. Keep unresolved threads with FIX / P1–P2 / concrete defect language.
3. Group by PR → file → finding. Deduplicate Codex + Vercel duplicates of the same issue.
4. Checkout each affected PR branch (`git fetch` + track remote). Do not invent a new branch for an existing PR.
5. Implement the minimal correct fix matching repo patterns (e.g. `sanitizeFirestoreData`, call-time env reads after dotenv).
6. Run the smallest relevant verify/lint for the touched area when a script exists.
7. Commit with a message that cites the bot finding, push to the PR branch, update the PR body with a short "Bot feedback addressed" note.
8. Resolve the review thread(s) once the fix is pushed. Reply only if the bot asked a question you cannot answer with code.

## Rules

- Prefer fixing over arguing. If the finding is wrong, leave a short rebuttal on the thread and leave it unresolved.
- One logical commit per PR when possible; never force-push shared branches.
- Do not merge to `main` / production. Do not change Vercel env vars or domains.
- Never commit secrets. If pre-commit secret scanning breaks on invalid injected names, filter `CLOUD_AGENT_INJECTED_SECRET_NAMES` to valid bash identifiers — do not `--no-verify`.
- Stop if a fix needs product direction or missing credentials; note the blocker on the PR.

## Output

End with a tight table: PR number, bot, finding, fix commit, thread resolved yes/no.
