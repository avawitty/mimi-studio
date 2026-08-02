/**
 * Fail if Vercel api/ handlers (or their static import closure from api/)
 * top-level-import known Node-heavy packages.
 *
 * Run: npm run verify:api-lazy-graphs
 *
 * Architecture Update 21 — serverless module boundary CI invariant.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apiRoot = path.join(root, "api");

/** Packages that must not appear as static imports from api/ entrypoints. */
const FORBIDDEN = [
  "firebase-admin",
  "firebase-admin/app",
  "firebase-admin/auth",
  "firebase-admin/firestore",
  "apify-client",
  "better-sqlite3",
  "node:sqlite",
  "stripe",
] as const;

/**
 * Files under api/ (or lib/ pulled only for allowlist exceptions) that may still
 * statically import a forbidden module while migration completes. Prefer removing
 * entries over growing this list.
 */
const ALLOWLIST: Record<string, string[]> = {
  // Stripe membership helpers are still migrated incrementally; sync-subscription
  // should prefer dynamic import — keep empty unless a temporary exception is needed.
};

const STATIC_IMPORT_RE =
  /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]/g;
const STATIC_REQUIRE_RE =
  /(?:^|\n)\s*(?:const|let|var)\s+[^=]+=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|js|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function collectStaticSpecs(source: string): string[] {
  const specs: string[] = [];
  for (const re of [STATIC_IMPORT_RE, STATIC_REQUIRE_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      specs.push(m[1]);
    }
  }
  return specs;
}

function isForbiddenSpec(spec: string): string | null {
  const normalized = spec.replace(/^node:/, "node:");
  for (const pkg of FORBIDDEN) {
    if (normalized === pkg || normalized.startsWith(`${pkg}/`)) return pkg;
  }
  return null;
}

type Finding = { file: string; spec: string; pkg: string; via: string };

function scanFromEntrypoint(entry: string): Finding[] {
  const findings: Finding[] = [];
  const queue = [entry];
  const seen = new Set<string>();

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    let source: string;
    try {
      source = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const rel = path.relative(root, file);
    const allowed = ALLOWLIST[rel] || [];

    for (const spec of collectStaticSpecs(source)) {
      const forbidden = isForbiddenSpec(spec);
      if (forbidden) {
        if (allowed.includes(forbidden) || allowed.includes(spec)) continue;
        findings.push({
          file: rel,
          spec,
          pkg: forbidden,
          via: path.relative(root, entry),
        });
        continue;
      }

      const resolved = resolveImport(file, spec);
      if (!resolved) continue;
      // Only follow into workspace sources (api/, lib/, services/, schemas/).
      const relResolved = path.relative(root, resolved);
      if (
        relResolved.startsWith("api/") ||
        relResolved.startsWith("lib/") ||
        relResolved.startsWith("services/") ||
        relResolved.startsWith("schemas/")
      ) {
        queue.push(resolved);
      }
    }
  }

  return findings;
}

const entries = walk(apiRoot);
const allFindings: Finding[] = [];
for (const entry of entries) {
  allFindings.push(...scanFromEntrypoint(entry));
}

// Dedupe
const key = (f: Finding) => `${f.via}|${f.file}|${f.spec}`;
const unique = [...new Map(allFindings.map((f) => [key(f), f])).values()];

if (unique.length) {
  console.error("verify:api-lazy-graphs FAILED — static heavy imports from api/:");
  for (const f of unique) {
    console.error(`  [${f.via}] ${f.file} imports "${f.spec}" (${f.pkg})`);
  }
  console.error(
    "\nLoad these via dynamic import() after cheap method/env checks. See docs/architecture-update-21.md §18–19.",
  );
  process.exit(1);
}

console.log(
  `verify:api-lazy-graphs passed (${entries.length} api entries, 0 forbidden static imports).`,
);
