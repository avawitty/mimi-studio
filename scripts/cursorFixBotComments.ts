/**
 * Cloud Cursor agent that addresses bot review comments on a PR branch.
 *
 * Usage:
 *   CURSOR_API_KEY=... REPO_URL=https://github.com/org/repo HEAD_REF=feature/x \
 *   PR_URL=https://github.com/org/repo/pull/N \
 *   npm run cursor:fix-bot-comments
 *
 * Optional:
 *   COMMENT_URL=... COMMENT_BODY=... COMMENT_AUTHOR=vercel[bot]
 *   CURSOR_SDK_MODEL=composer-2
 */
import { Agent, CursorAgentError } from "@cursor/sdk";
import type { SDKAgent } from "@cursor/sdk";

const BOT_HINT =
  "vercel[bot], chatgpt-codex-connector[bot], cursor[bot], copilot-pull-request-reviewer[bot], github-actions[bot]";

async function main() {
  const {
    CURSOR_API_KEY,
    REPO_URL,
    HEAD_REF,
    BASE_REF = "main",
    PR_URL,
    COMMENT_URL,
    COMMENT_BODY,
    COMMENT_AUTHOR,
    CURSOR_SDK_MODEL = "composer-2",
  } = process.env;

  if (!CURSOR_API_KEY?.trim() || !REPO_URL?.trim() || !HEAD_REF?.trim()) {
    console.error("Missing required env: CURSOR_API_KEY, REPO_URL, HEAD_REF");
    process.exit(1);
  }

  const triggerBits = [
    COMMENT_AUTHOR ? `Author: ${COMMENT_AUTHOR}` : null,
    COMMENT_URL ? `Comment: ${COMMENT_URL}` : null,
    COMMENT_BODY ? `Body:\n${COMMENT_BODY}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Fix actionable automation-bot review comments on this PR.

PR: ${PR_URL || "(unknown)"}
Branch: ${HEAD_REF} (base ${BASE_REF})
Repo: ${REPO_URL}

${triggerBits ? `## Triggering comment\n${triggerBits}\n` : ""}
## Instructions

Follow .cursor/skills/fix-bot-pr-comments/SKILL.md and docs/automations/fix-bot-pr-comments.md.

Prioritize bots: ${BOT_HINT}.
Skip deploy blobs and Bugbot usage-limit notices.

Checkout the existing PR branch (${HEAD_REF}), apply the minimal fix, verify if a small
script exists, commit + push to the same branch, update the PR body, and resolve
addressed review threads. Do not open a new PR. Do not merge or approve.`;

  let agent: SDKAgent | undefined;
  try {
    agent = await Agent.create({
      apiKey: CURSOR_API_KEY.trim(),
      model: { id: CURSOR_SDK_MODEL },
      cloud: {
        repos: [{ url: REPO_URL, startingRef: HEAD_REF }],
        workOnCurrentBranch: true,
        skipReviewerRequest: true,
      },
    });

    const run = await agent.send(prompt);
    console.log(`[cursor:fix-bot-comments] agent=${agent.agentId} run=${run.id}`);

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        if (event.type === "status") {
          console.log(`[cursor:fix-bot-comments] status=${event.status}`);
        }
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(
        `[cursor:fix-bot-comments] run ${result.id} ended as ${result.status}`,
      );
      process.exit(2);
    }
    console.log(`[cursor:fix-bot-comments] done (${result.durationMs ?? "?"}ms)`);
    if (result.result) console.log(result.result);
    process.exit(0);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `[cursor:fix-bot-comments] startup failed: ${err.message} (retryable=${err.isRetryable})`,
      );
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
  }
}

main();
