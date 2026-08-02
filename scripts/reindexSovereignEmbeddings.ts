/**
 * Backfill AI Gateway embeddings into the sovereign archive.
 *
 *   npm run sovereign:reindex
 *   npm run sovereign:reindex -- --limit=100 --force
 */
import { reindexZineEmbeddings, isSovereignGatewayEmbedEnabled } from "../lib/sovereign/embeddings.js";
import { sovereignStatus } from "../lib/sovereign/store.js";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
const force = args.includes("--force");

async function main() {
  if (!isSovereignGatewayEmbedEnabled()) {
    console.error(
      "Gateway embeddings disabled — set AI_GATEWAY_API_KEY (or MIMI_SOVEREIGN_EMBED=1 with OIDC).",
    );
    process.exit(1);
  }
  const before = await sovereignStatus();
  console.log("Before:", {
    backend: before.backend,
    embeddedCount: before.embeddedCount,
    zineCount: before.zineCount,
  });
  const result = await reindexZineEmbeddings({
    limit: Number.isFinite(limit) ? limit : 50,
    force,
  });
  const after = await sovereignStatus();
  console.log("Reindex:", result);
  console.log("After:", {
    embeddedCount: after.embeddedCount,
    gatewayEmbed: after.gatewayEmbed,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
