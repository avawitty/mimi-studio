/**
 * Seed the sovereign archive with the demo shelf (or import a JSON file).
 *
 * Usage:
 *   MIMI_SOVEREIGN_SEED_DEMO=1 npx tsx scripts/seedSovereignDemo.ts
 *   npx tsx scripts/seedSovereignDemo.ts --import path/to/export.json
 */

import fs from "node:fs";
import path from "node:path";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import {
  importZines,
  seedDemoShelfIfEmpty,
  sovereignStatus,
  upsertProfile,
} from "../lib/sovereign/store";
import type { UserProfile, ZineMetadata } from "../types";

const importIdx = process.argv.indexOf("--import");
const importPath =
  importIdx >= 0
    ? process.argv[importIdx + 1]
    : process.argv.find((arg) => arg.startsWith("--import="))?.split("=")[1];

async function main() {
  process.env.MIMI_SOVEREIGN_ENABLED = process.env.MIMI_SOVEREIGN_ENABLED || "1";
  if (!process.env.MIMI_SOVEREIGN_DB && !process.env.MIMI_SOVEREIGN_DATABASE_URL) {
    process.env.MIMI_SOVEREIGN_DB = path.join(process.cwd(), ".data", "sovereign.sqlite");
  }
  await resetSovereignDbForTests();

  if (importPath) {
    const raw = fs.readFileSync(path.resolve(importPath), "utf8");
    const payload = JSON.parse(raw) as { zines?: ZineMetadata[]; profiles?: UserProfile[] };
    let profilesUpserted = 0;
    for (const profile of payload.profiles || []) {
      if (!profile?.uid) continue;
      await upsertProfile(profile);
      profilesUpserted += 1;
    }
    const { imported, skipped } = await importZines(payload.zines || []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          imported,
          skipped,
          profilesUpserted,
          archive: await sovereignStatus(),
        },
        null,
        2,
      ),
    );
    return;
  }

  process.env.MIMI_SOVEREIGN_SEED_DEMO = "1";
  const seeded = await seedDemoShelfIfEmpty();
  console.log(
    JSON.stringify({ ok: true, seeded, archive: await sovereignStatus() }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
