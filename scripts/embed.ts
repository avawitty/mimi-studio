/**
 * Offline CLIP + UMAP pipeline for the taste corpus embedding explorer.
 *
 *   npm run corpus:embed
 *   npm run corpus:embed -- --manifest=data/taste-corpus.manifest.json
 *
 * Writes:
 *   public/data/embeddings.json       — 2D coords + id + thumbnail only
 *   public/data/taste-corpus-index.json — titles + hrefs for SEO / click-through
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline, RawImage } from "@xenova/transformers";
import { UMAP } from "umap-js";
import type {
  EmbeddingsArtifact,
  TasteCorpusIndex,
  TasteCorpusManifest,
} from "../lib/taste-corpus/types.js";

const CLIP_MODEL = "Xenova/clip-vit-base-patch32";
const UMAP_N_NEIGHBORS = 15;
const UMAP_MIN_DIST = 0.1;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs() {
  const manifestArg = process.argv.find((a) => a.startsWith("--manifest="));
  const outDirArg = process.argv.find((a) => a.startsWith("--out-dir="));
  return {
    manifestPath: manifestArg
      ? path.resolve(ROOT, manifestArg.split("=")[1]!)
      : path.join(ROOT, "data", "taste-corpus.manifest.json"),
    outDir: outDirArg
      ? path.resolve(ROOT, outDirArg.split("=")[1]!)
      : path.join(ROOT, "public", "data"),
  };
}

function hashManifest(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function normalizeCoords(coords: number[][]): { x: number; y: number }[] {
  if (!coords.length) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  return coords.map(([x, y]) => ({
    x: ((x - minX) / spanX) * 2 - 1,
    y: ((y - minY) / spanY) * 2 - 1,
  }));
}

async function loadImage(url: string): Promise<RawImage> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return RawImage.fromURL(url);
  }
  const localPath = path.isAbsolute(url) ? url : path.join(ROOT, url);
  return RawImage.read(localPath);
}

async function main() {
  const { manifestPath, outDir } = parseArgs();

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as TasteCorpusManifest;
  const items = manifest.items ?? [];

  if (!items.length) {
    console.error("Manifest has no items.");
    process.exit(1);
  }

  console.log(`Embedding ${items.length} specimens with ${CLIP_MODEL}…`);
  const extractor = await pipeline("image-feature-extraction", CLIP_MODEL, {
    quantized: true,
  });

  const vectors: number[][] = [];
  const embeddedItems: typeof items = [];

  for (const item of items) {
    try {
      const image = await loadImage(item.thumbnailUrl);
      const output = await extractor(image);
      const raw = Array.from(output.data as Float32Array);
      const norm = Math.hypot(...raw) || 1;
      const vector = raw.map((v) => v / norm);
      if (!vector.length) {
        console.warn(`Skipping ${item.id}: empty embedding`);
        continue;
      }
      vectors.push(vector);
      embeddedItems.push(item);
      console.log(`  ✓ ${item.id}`);
    } catch (error) {
      console.warn(`Skipping ${item.id}:`, error instanceof Error ? error.message : error);
    }
  }

  if (vectors.length < 2) {
    console.error("Need at least 2 successful embeddings for UMAP.");
    process.exit(1);
  }

  const nNeighbors = Math.min(UMAP_N_NEIGHBORS, Math.max(2, vectors.length - 1));
  console.log(`Running UMAP (n_neighbors=${nNeighbors}, min_dist=${UMAP_MIN_DIST})…`);

  const umap = new UMAP({
    nNeighbors,
    minDist: UMAP_MIN_DIST,
    nComponents: 2,
  });
  const projection = umap.fit(vectors) as number[][];
  const normalized = normalizeCoords(projection);

  const artifact: EmbeddingsArtifact = {
    meta: {
      model: CLIP_MODEL,
      umap: { n_neighbors: nNeighbors, min_dist: UMAP_MIN_DIST },
      coordSpace: "[-1,1]",
      generatedAt: new Date().toISOString(),
      count: embeddedItems.length,
      manifestHash: hashManifest(manifestRaw),
    },
    points: embeddedItems.map((item, index) => ({
      id: item.id,
      x: normalized[index]!.x,
      y: normalized[index]!.y,
      thumbnailUrl: item.thumbnailUrl,
    })),
  };

  const index: TasteCorpusIndex = {
    version: 1,
    items: embeddedItems.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
    })),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "embeddings.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(outDir, "taste-corpus-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );

  console.log(`Wrote ${artifact.points.length} points → ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
