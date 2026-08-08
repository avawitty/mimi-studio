/**
 * Backfill public Stand Floor zines as floor_{zineId} EvidenceAtoms.
 *
 *   npx tsx scripts/backfillFloorEvidenceAtoms.ts [--dry-run] [--limit=200] [--user=uid]
 *
 * Requires Firebase Admin (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_FILE).
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ZineMetadata } from "../types";
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

interface BackfillStats {
  zinesRead: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const userArg = process.argv.find((a) => a.startsWith("--user="));
  return {
    dryRun,
    limit: Math.max(1, Math.min(Number(limitArg?.split("=")[1] ?? 200), 5000)),
    userId: userArg?.split("=")[1],
  };
}

async function mirrorFloorZineAdmin(
  db: { collection: (path: string) => any },
  zine: ZineMetadata,
  dryRun: boolean,
): Promise<"created" | "updated" | "skipped"> {
  const userId = zine.userId;
  if (!userId || userId === "ghost" || !zine.id) return "skipped";

  const input = floorZineToAtomInput(zine);
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

async function main() {
  const opts = parseArgs();
  const stats: BackfillStats = {
    zinesRead: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin.js");
  const { db } = getServerFirebaseAdmin();
  if (!db) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "Firebase Admin unavailable — set FIREBASE_SERVICE_ACCOUNT",
      }),
    );
    process.exit(1);
  }

  let query = db.collection("zines").where("isPublic", "==", true).limit(opts.limit);
  if (opts.userId) {
    query = db
      .collection("zines")
      .where("isPublic", "==", true)
      .where("userId", "==", opts.userId)
      .limit(opts.limit);
  }

  const snap = await query.get();
  stats.zinesRead = snap.size;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as ZineMetadata;
    const zine: ZineMetadata = { ...data, id: data.id || docSnap.id };
    try {
      const outcome = await mirrorFloorZineAdmin(db, zine, opts.dryRun);
      if (outcome === "created") stats.created += 1;
      else if (outcome === "updated") stats.updated += 1;
      else stats.skipped += 1;
    } catch (err) {
      stats.errors.push(`${zine.id}:${String(err)}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: opts.dryRun,
        userFilter: opts.userId ?? null,
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
