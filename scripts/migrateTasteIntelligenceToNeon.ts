/**
 * Idempotent migration: Firestore taste state → Neon.
 * Run: npx tsx scripts/migrateTasteIntelligenceToNeon.ts [--dry-run] [--user=uid] [--batch=100]
 */
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

interface MigrationStats {
  eventsRead: number;
  eventsWritten: number;
  snapshotsRead: number;
  snapshotsWritten: number;
  duplicates: number;
  malformed: string[];
  checksumBefore: string;
  checksumAfter: string;
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const userArg = process.argv.find((a) => a.startsWith("--user="));
  const batchArg = process.argv.find((a) => a.startsWith("--batch="));
  const projectArg = process.argv.find((a) => a.startsWith("--project="));
  return {
    dryRun,
    userId: userArg?.split("=")[1],
    batch: Number(batchArg?.split("=")[1] ?? 100),
    projectId: projectArg?.split("=")[1],
  };
}

function simpleChecksum(n: number): string {
  return `count:${n}`;
}

async function initAdmin() {
  if (getApps().length === 0) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) {
      console.log("FIREBASE_SERVICE_ACCOUNT not set — migration will no-op Firestore reads.");
      return null;
    }
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getFirestore();
}

async function migrateUser(
  db: FirebaseFirestore.Firestore,
  userId: string,
  opts: ReturnType<typeof parseArgs>,
  stats: MigrationStats,
) {
  const { getNeonUnitOfWork } = await import(
    "../infrastructure/database/neon/unitOfWork.js"
  );
  const { normalizeTasteEvent } = await import("../lib/tasteModel/index.js");
  const uow = getNeonUnitOfWork();
  const repo = uow.repositories.tasteIntelligence;

  const eventsSnap = await db
    .collection(`users/${userId}/tasteLearningEvents`)
    .limit(opts.batch)
    .get();
  stats.eventsRead += eventsSnap.size;

  for (const doc of eventsSnap.docs) {
    try {
      const raw = doc.data();
      const normalized = normalizeTasteEvent(raw as import("../lib/tasteModel/contracts.js").AnyTasteEvent);
      const existing = await repo.findLegacyMapping(
        "firestore",
        "tasteLearningEvents",
        doc.id,
      );
      if (existing) {
        stats.duplicates += 1;
        continue;
      }
      if (!opts.dryRun) {
        await uow.transaction(async (repositories) => {
          await repositories.tasteIntelligence.upsertLearningEvent(
            userId,
            normalized,
            doc.id,
          );
          await repositories.tasteIntelligence.recordLegacyMapping({
            legacySystem: "firestore",
            legacyCollection: "tasteLearningEvents",
            legacyId: doc.id,
            canonicalTable: "taste_learning_events",
            canonicalId: randomUUID(),
            migrationStatus: "migrated",
            metadata: { canonicalTextId: normalized.id },
          });
        });
        stats.eventsWritten += 1;
      }
    } catch (e) {
      stats.malformed.push(`event:${doc.id}:${String(e)}`);
    }
  }

  for (const scope of ["global", opts.projectId ? `project-${opts.projectId}` : null].filter(Boolean)) {
    const snapDoc = await db.doc(`users/${userId}/tasteModelSnapshots/${scope}`).get();
    if (!snapDoc.exists) continue;
    stats.snapshotsRead += 1;
    const snapshot = snapDoc.data();
    if (!snapshot?.id) {
      stats.malformed.push(`snapshot:${scope}:missing-id`);
      continue;
    }
    const existing = await repo.findLegacyMapping(
      "firestore",
      "tasteModelSnapshots",
      scope!,
    );
    if (existing) {
      stats.duplicates += 1;
      continue;
    }
    if (!opts.dryRun) {
      await uow.transaction(async (repositories) => {
        await repositories.tasteIntelligence.saveSnapshot(
          userId,
          snapshot as import("../lib/tasteModel/contracts.js").TasteModelSnapshot,
          { projectId: opts.projectId },
        );
        await repositories.tasteIntelligence.recordLegacyMapping({
          legacySystem: "firestore",
          legacyCollection: "tasteModelSnapshots",
          legacyId: scope!,
          canonicalTable: "taste_model_snapshots",
          canonicalId: randomUUID(),
          migrationStatus: "migrated",
          metadata: { canonicalTextId: snapshot.id },
        });
      });
      stats.snapshotsWritten += 1;
    }
  }
}

async function main() {
  const opts = parseArgs();
  const stats: MigrationStats = {
    eventsRead: 0,
    eventsWritten: 0,
    snapshotsRead: 0,
    snapshotsWritten: 0,
    duplicates: 0,
    malformed: [],
    checksumBefore: "",
    checksumAfter: "",
  };

  const db = await initAdmin();
  if (!db) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "no-firestore" }));
    return;
  }

  if (opts.userId) {
    await migrateUser(db, opts.userId, opts, stats);
  } else {
    console.log("Provide --user=uid for targeted migration (full scan not enabled by default).");
  }

  stats.checksumBefore = simpleChecksum(stats.eventsRead + stats.snapshotsRead);
  stats.checksumAfter = simpleChecksum(stats.eventsWritten + stats.snapshotsWritten);

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
