/**
 * One-shot export of public Firestore zines (+ profiles) into the sovereign archive.
 *
 * Requires Admin credentials and enough Firestore quota to read.
 *
 *   FIREBASE_SERVICE_ACCOUNT_FILE=... \
 *   FIREBASE_FIRESTORE_DATABASE_ID=... \
 *   npx tsx scripts/exportFirestoreToSovereign.ts
 *
 * Options:
 *   --limit=200
 *   --dry-run
 *   --out=./.data/firestore-export.json  (also writes JSON even when importing)
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import {
  importZines,
  sovereignStatus,
  upsertProfile,
} from "../lib/sovereign/store";
import type { UserProfile, ZineMetadata } from "../types";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const limit = Math.max(1, Math.min(Number(arg("limit") || 200), 2000));
  const dryRun = hasFlag("dry-run");
  const outPath = arg("out") || path.join(process.cwd(), ".data", "firestore-export.json");

  process.env.MIMI_SOVEREIGN_ENABLED = process.env.MIMI_SOVEREIGN_ENABLED || "1";
  if (!process.env.MIMI_SOVEREIGN_DB && !process.env.MIMI_SOVEREIGN_DATABASE_URL) {
    process.env.MIMI_SOVEREIGN_DB = path.join(process.cwd(), ".data", "sovereign.sqlite");
  }

  const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin");
  const { db } = getServerFirebaseAdmin();
  if (!db) {
    throw new Error("Firebase Admin unavailable — set FIREBASE_SERVICE_ACCOUNT(_FILE)");
  }

  console.info(`MIMI // Exporting up to ${limit} public zines from Firestore…`);
  const zineSnap = await db
    .collection("zines")
    .where("isPublic", "==", true)
    .limit(limit)
    .get();

  const zines: ZineMetadata[] = zineSnap.docs.map((docSnap: { id: string; data: () => ZineMetadata }) => {
    const data = docSnap.data() as ZineMetadata;
    return { ...data, id: data.id || docSnap.id };
  });

  const uids = [...new Set(zines.map((z) => z.userId).filter(Boolean))];
  const profiles: UserProfile[] = [];
  for (const uid of uids) {
    try {
      const snap = await db.collection("profiles_public").doc(uid).get();
      if (snap.exists) {
        profiles.push({ ...(snap.data() as UserProfile), uid });
      }
    } catch (error) {
      console.warn(`MIMI // profile export skipped for ${uid}:`, error);
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ zines, profiles, exportedAt: Date.now() }, null, 2));
  console.info(`MIMI // Wrote ${zines.length} zines / ${profiles.length} profiles → ${outPath}`);

  if (dryRun) {
    console.info("MIMI // dry-run: not importing into sovereign");
    return;
  }

  await resetSovereignDbForTests();
  for (const profile of profiles) {
    await upsertProfile(profile);
  }
  const { imported, skipped } = await importZines(zines);
  console.info(
    JSON.stringify(
      {
        ok: true,
        imported,
        skipped,
        profilesUpserted: profiles.length,
        archive: await sovereignStatus(),
        outPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
