/**
 * Backfill saved Darkroom StyleTreatments from profiles_public as darkroom_{id} EvidenceAtoms.
 *
 *   npx tsx scripts/backfillDarkroomTreatments.ts [--dry-run] [--limit=200] [--user=uid]
 *
 * Requires Firebase Admin (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_FILE).
 * Scans profiles_public and userPreferences (legacy split) for savedTreatments.
 */
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { StyleTreatment, UserProfile } from "../types";
import {
  darkroomEvidenceAtomId,
  darkroomTreatmentToAtomInput,
} from "../lib/taste/darkroomAtomBridge.js";
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
  profilesRead: number;
  prefsRead: number;
  profilesWithTreatments: number;
  treatmentsRead: number;
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

function normalizeTreatment(raw: unknown): StyleTreatment | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as StyleTreatment;
  if (!t.id || !t.canonicalTaste) return null;
  if (!t.treatmentName?.trim()) return null;
  return {
    id: String(t.id),
    createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    treatmentName: t.treatmentName,
    canonicalTaste: t.canonicalTaste,
    tags: Array.isArray(t.tags) ? t.tags : undefined,
  };
}

async function mirrorTreatmentAdmin(
  db: { collection: (path: string) => any },
  userId: string,
  treatment: StyleTreatment,
  dryRun: boolean,
): Promise<"created" | "updated" | "skipped"> {
  if (!userId || userId === "ghost" || !treatment.id) return "skipped";

  const input = darkroomTreatmentToAtomInput(treatment);
  if (!input) return "skipped";

  const atomId = darkroomEvidenceAtomId(treatment.id);
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

async function processTreatmentsForUser(
  db: { collection: (path: string) => any },
  userId: string,
  rawTreatments: unknown,
  stats: BackfillStats,
  dryRun: boolean,
): Promise<void> {
  if (!Array.isArray(rawTreatments) || rawTreatments.length === 0) return;

  stats.profilesWithTreatments += 1;

  for (const raw of rawTreatments) {
    const treatment = normalizeTreatment(raw);
    if (!treatment) {
      stats.skipped += 1;
      continue;
    }

    stats.treatmentsRead += 1;
    try {
      const outcome = await mirrorTreatmentAdmin(db, userId, treatment, dryRun);
      if (outcome === "created") stats.created += 1;
      else if (outcome === "updated") stats.updated += 1;
      else stats.skipped += 1;
    } catch (err) {
      stats.errors.push(`${userId}/${treatment.id}:${String(err)}`);
    }
  }
}

async function main() {
  const opts = parseArgs();
  const stats: BackfillStats = {
    profilesRead: 0,
    prefsRead: 0,
    profilesWithTreatments: 0,
    treatmentsRead: 0,
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

  if (opts.userId) {
    const pubSnap = await db.collection("profiles_public").doc(opts.userId).get();
    if (pubSnap.exists) {
      stats.profilesRead += 1;
      const profile = pubSnap.data() as UserProfile;
      await processTreatmentsForUser(
        db,
        profile.uid || pubSnap.id,
        profile.savedTreatments,
        stats,
        opts.dryRun,
      );
    }
    const prefSnap = await db.collection("userPreferences").doc(opts.userId).get();
    if (prefSnap.exists) {
      stats.prefsRead += 1;
      const prefs = prefSnap.data() as UserProfile;
      await processTreatmentsForUser(
        db,
        opts.userId,
        prefs.savedTreatments,
        stats,
        opts.dryRun,
      );
    }
  } else {
    const pubSnap = await db.collection("profiles_public").limit(opts.limit).get();
    stats.profilesRead = pubSnap.size;
    for (const docSnap of pubSnap.docs) {
      const profile = docSnap.data() as UserProfile;
      const userId = profile.uid || docSnap.id;
      await processTreatmentsForUser(
        db,
        userId,
        profile.savedTreatments,
        stats,
        opts.dryRun,
      );
    }

    const prefSnap = await db.collection("userPreferences").limit(opts.limit).get();
    stats.prefsRead = prefSnap.size;
    for (const docSnap of prefSnap.docs) {
      const prefs = docSnap.data() as UserProfile;
      await processTreatmentsForUser(
        db,
        docSnap.id,
        prefs.savedTreatments,
        stats,
        opts.dryRun,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: opts.dryRun,
        userFilter: opts.userId ?? null,
        profileScanLimit: opts.userId ? 1 : opts.limit,
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
