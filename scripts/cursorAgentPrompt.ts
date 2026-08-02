/**
 * Local one-shot Cursor agent against this checkout.
 *
 * Usage:
 *   CURSOR_API_KEY=... npm run cursor:prompt -- "Summarize risk in services/aiProvider.ts"
 *
 * Runtime: local (cwd = repo root). Does not open PRs — use scripts/cursorCloudReview.ts for that.
 */
import { Agent, CursorAgentError } from "@cursor/sdk";

async function main() {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing CURSOR_API_KEY. Set it in the environment (see .env.example).");
    process.exit(1);
  }

  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error('Usage: npm run cursor:prompt -- "<prompt>"');
    process.exit(1);
  }

  const modelId = process.env.CURSOR_SDK_MODEL?.trim() || "composer-2";
  const cwd = process.cwd();

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: modelId },
      local: {
        cwd,
        // Keep ambient Cursor settings off for predictable CI/scripts.
        settingSources: [],
      },
    });

    if (result.status === "error") {
      console.error(`[cursor:prompt] run failed: ${result.id ?? "unknown"}`);
      process.exit(2);
    }

    console.log(result.result ?? "");
    process.exit(0);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `[cursor:prompt] startup failed: ${err.message} (retryable=${err.isRetryable})`,
      );
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  }
}

main();
