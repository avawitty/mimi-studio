/**
 * Run server-side evidence atom interpretation + embedding for pending/failed atoms.
 *
 *   npx tsx scripts/analyzePendingEvidenceAtoms.ts [--dry-run] [--limit=50] [--user=uid] [--profiles=500]
 *
 * Requires Firebase Admin + AI_GATEWAY_API_KEY (or funded gateway env).
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { runEvidenceAtomAnalysis } from "../lib/taste/evidenceAtomAnalysis.js";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

if (
  !process.env.FIREBASE_SERVICE_ACCOUNT &&
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE
) {
  const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_FILE);
  if (fs.existsSync(serviceAccountPath)) {
    process.env.FIREBASE_SERVICE_ACCOUNT = fs.readFileSync(serviceAccountPath, "utf8");
  }
}

interface AnalyzeStats {
  profilesScanned: number;
  atomsScanned: number;
  analyzed: number;
  skipped: number;
  errors: string[];
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const userArg = process.argv.find((a) => a.startsWith("--user="));
  const profilesArg = process.argv.find((a) => a.startsWith("--profiles="));
  const prefixArg = process.argv.find((a) => a.startsWith("--prefix="));
  return {
    dryRun,
    atomLimit: Math.max(1, Math.min(Number(limitArg?.split("=")[1] ?? 50), 500)),
    userId: userArg?.split("=")[1],
    profileLimit: Math.max(1, Math.min(Number(profilesArg?.split("=")[1] ?? 500), 5000)),
    idPrefix: prefixArg?.split("=")[1],
  };
}

function resolveGatewayKey(): string | null {
  return (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.AI_GATEWAY_KEY?.trim() ||
    null
  );
}

async function scanUserAtoms(
  db: { collection: (path: string) => any },
  userId: string,
  opts: ReturnType<typeof parseArgs>,
  stats: AnalyzeStats,
  apiKey: string,
): Promise<void> {
  if (stats.analyzed >= opts.atomLimit) return;

  const col = db.collection("users").doc(userId).collection("evidenceAtoms");
  let snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> };
  try {
    snap = await col
      .where("processingState", "in", ["pending", "failed"])
      .limit(Math.min(opts.atomLimit, 100))
      .get();
  } catch {
    snap = await col.limit(100).get();
  }

  for (const docSnap of snap.docs) {
    if (stats.analyzed >= opts.atomLimit) return;

    const atomId = docSnap.id;
    if (opts.idPrefix && !atomId.startsWith(opts.idPrefix)) continue;

    const data = docSnap.data() as { processingState?: string };
    const state = data.processingState ?? "pending";
    if (state === "analyzed") {
      stats.skipped += 1;
      continue;
    }

    stats.atomsScanned += 1;

    if (opts.dryRun) {
      stats.analyzed += 1;
      continue;
    }

    try {
      await runEvidenceAtomAnalysis(db, userId, atomId, apiKey);
      stats.analyzed += 1;
    } catch (err) {
      stats.errors.push(`${userId}/${atomId}:${String(err)}`);
    }
  }
}

async function main() {
  const opts = parseArgs();
  const apiKey = resolveGatewayKey();
  if (!apiKey) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "AI_GATEWAY_API_KEY required for evidence analyze",
      }),
    );
    process.exit(1);
  }

  const stats: AnalyzeStats = {
    profilesScanned: 0,
    atomsScanned: 0,
    analyzed: 0,
    skipped: 0,
    errors: [],
  };

  const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin.js");
  const { db } = getServerFirebaseAdmin();
  if (!db) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "Firebase Admin unavailable",
      }),
    );
    process.exit(1);
  }

  if (opts.userId) {
    stats.profilesScanned = 1;
    await scanUserAtoms(db, opts.userId, opts, stats, apiKey);
  } else {
    const profileSnap = await db
      .collection("profiles_public")
      .limit(opts.profileLimit)
      .get();
    stats.profilesScanned = profileSnap.size;

    for (const profileDoc of profileSnap.docs) {
      if (stats.analyzed >= opts.atomLimit) break;
      const uid = profileDoc.id;
      await scanUserAtoms(db, uid, opts, stats, apiKey);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: opts.dryRun,
        stats,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
