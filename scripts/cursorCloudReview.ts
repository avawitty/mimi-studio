/**
 * Cloud Cursor agent for PR review (opens work on a GitHub ref).
 *
 * Usage (typically from CI):
 *   CURSOR_API_KEY=... REPO_URL=https://github.com/org/repo HEAD_REF=feature/x \
 *   BASE_REF=main PR_URL=https://github.com/org/repo/pull/N \
 *   npm run cursor:cloud-review
 *
 * Requires the API key owner to have GitHub access to REPO_URL.
 */
import { Agent, CursorAgentError } from "@cursor/sdk";
import type { SDKAgent } from "@cursor/sdk";

async function main() {
  const {
    CURSOR_API_KEY,
    REPO_URL,
    HEAD_REF,
    BASE_REF = "main",
    PR_URL,
    CURSOR_SDK_MODEL = "composer-2",
  } = process.env;

  if (!CURSOR_API_KEY?.trim() || !REPO_URL?.trim() || !HEAD_REF?.trim()) {
    console.error("Missing required env: CURSOR_API_KEY, REPO_URL, HEAD_REF");
    process.exit(1);
  }

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

    const prompt = `Review the changes on ${HEAD_REF} vs ${BASE_REF}${
      PR_URL ? ` for ${PR_URL}` : ""
    }.
Focus on: correctness, security, TypeScript safety, and Mimi product contracts
(approval before memory, visible Used Context, no secrets in commits).
Post concrete findings only. If nothing material, say so in one short paragraph.`;

    const run = await agent.send(prompt);
    console.log(`[cursor:cloud-review] agent=${agent.agentId} run=${run.id}`);

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        if (event.type === "status") {
          console.log(`[cursor:cloud-review] status=${event.status}`);
        }
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(`[cursor:cloud-review] run ${result.id} ended as ${result.status}`);
      process.exit(2);
    }
    console.log(`[cursor:cloud-review] done (${result.durationMs ?? "?"}ms)`);
    if (result.result) console.log(result.result);
    process.exit(0);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `[cursor:cloud-review] startup failed: ${err.message} (retryable=${err.isRetryable})`,
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
