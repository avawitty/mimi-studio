/**
 * Backfill public Stand Floor zines from the sovereign archive as floor_{zineId} EvidenceAtoms.
 *
 *   npx tsx scripts/backfillFloorEvidenceAtomsFromSovereign.ts [--dry-run] [--limit=200]
 *
 * Requires:
 * - Sovereign archive (MIMI_SOVEREIGN_DATABASE_URL or MIMI_SOVEREIGN_DB / local .data/sovereign.sqlite)
 * - Firebase Admin (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_FILE)
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ZineMetadata } from "../types";
import { getSovereignDb } from "../lib/sovereign/db.js";
import {
  floorZineEvidenceAtomId,
  floorZineToAtomInput,
} from "../lib/taste/floorAtomBridge.js";
import {
  buildEvidenceAtomFromInput,
  stripUndefinedForFirestore,
} from "../lib/taste/buildEvidenceAtom.js";

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

process.env.MIMI_SOVEREIGN_ENABLED = process.env.MIMI_SOVEREIGN_ENABLED || "1";
if (
  !process.env.MIMI_SOVEREIGN_DB &&
  !process.env.MIMI_SOVEREIGN_DATABASE_URL &&
  !process.env.DATABASE_URL
) {
  process.env.MIMI_SOVEREIGN_DB = path.join(process.cwd(), ".data", "sovereign.sqlite");
}

interface BackfillStats {
  sovereignPublicZines: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  return {
    dryRun,
    limit: Math.max(1, Math.min(Number(limitArg?.split("=")[1] ?? 200), 5000)),
  };
}

async function mirrorFloorZineAdmin(
  db: { collection: (path: string) => any },
  zine: ZineMetadata,
  dryRun: boolean,
): Promise<"created" | "updated" | "skipped"> {
  const userId = zine.userId;
  if (!userId || userId === "ghost" || !zine.id) return "skipped";

  const input = floorZineToAtomInput({ ...zine, isPublic: true });
  if (!input) return "skipped";

  const atomId = floorZineEvidenceAtomId(zine.id);
  const ref = db
    .collection("users")
    .doc(userId)
    .collection("evidenceAtoms")
    .doc(atomId);

  const existing = await ref.get();

  if (existing.exists) {
    if (dryRun) return "updated";
    await ref.set(
      stripUndefinedForFirestore({
        originalSource: input.originalSource,
        assetUrl: input.assetUrl,
        thumbnailUrl: input.thumbnailUrl,
        sourceMetadata: input.sourceMetadata,
        updatedAt: Date.now(),
      }),
      { merge: true },
    );
    return "updated";
  }

  if (dryRun) return "created";

  const atom = buildEvidenceAtomFromInput(userId, input, { id: atomId });
  await ref.set(stripUndefinedForFirestore(atom));
  return "created";
}

async function listPublicZinesFromSovereign(limit: number): Promise<ZineMetadata[]> {
  const db = await getSovereignDb();
  if (!db) return [];

  const rows = await db
    .prepare(
      `SELECT data FROM zines
       WHERE is_public = 1
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all<{ data: string }>(limit);

  return rows.map((row) => JSON.parse(row.data) as ZineMetadata);
}

async function main() {
  const opts = parseArgs();
  const stats: BackfillStats = {
    sovereignPublicZines: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const zines = await listPublicZinesFromSovereign(opts.limit);
  stats.sovereignPublicZines = zines.length;

  const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin.js");
  const { db } = getServerFirebaseAdmin();
  if (!db) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "Firebase Admin unavailable — set FIREBASE_SERVICE_ACCOUNT",
        stats,
      }),
    );
    process.exit(1);
  }

  for (const zine of zines) {
    try {
      const outcome = await mirrorFloorZineAdmin(db, zine, opts.dryRun);
      if (outcome === "created") stats.created += 1;
      else if (outcome === "updated") stats.updated += 1;
      else stats.skipped += 1;
    } catch (err) {
      stats.errors.push(`${zine.id}:${String(err)}`);
    }
  }

  const { sovereignStatus } = await import("../lib/sovereign/store.js");
  const sovereign = await sovereignStatus();

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: opts.dryRun,
        sovereign: {
          backend: sovereign.backend,
          publicCount: sovereign.publicCount,
          path: sovereign.path,
        },
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
