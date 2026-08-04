/**
 * Offline checks for taste corpus embedding artifacts and join coverage.
 *
 * Run: npm run verify:corpus
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { joinCorpusPoints } from "../lib/taste-corpus/joinCorpusPoints.js";
import type {
  EmbeddingsArtifact,
  TasteCorpusIndex,
  TasteCorpusManifest,
} from "../lib/taste-corpus/types.js";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "data", "taste-corpus.manifest.json");
const EMBEDDINGS_PATH = path.join(ROOT, "public", "data", "embeddings.json");
const INDEX_PATH = path.join(ROOT, "public", "data", "taste-corpus-index.json");

function assertManifest() {
  assert.ok(fs.existsSync(MANIFEST_PATH), "data/taste-corpus.manifest.json must exist");
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as TasteCorpusManifest;
  assert.equal(manifest.version, 1);
  assert.ok(manifest.items.length > 0, "manifest must have items");
  for (const item of manifest.items) {
    assert.ok(item.id, "manifest item needs id");
    assert.ok(item.title, "manifest item needs title");
    assert.ok(item.thumbnailUrl, "manifest item needs thumbnailUrl");
    assert.ok(item.href, "manifest item needs href");
  }
}

function assertArtifacts() {
  assert.ok(fs.existsSync(EMBEDDINGS_PATH), "public/data/embeddings.json missing — run npm run corpus:embed");
  assert.ok(
    fs.existsSync(INDEX_PATH),
    "public/data/taste-corpus-index.json missing — run npm run corpus:embed",
  );

  const embeddings = JSON.parse(
    fs.readFileSync(EMBEDDINGS_PATH, "utf8"),
  ) as EmbeddingsArtifact;
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as TasteCorpusIndex;

  assert.ok(embeddings.meta, "embeddings meta required");
  assert.equal(embeddings.meta.coordSpace, "[-1,1]");
  assert.equal(embeddings.meta.umap.min_dist, 0.1);
  assert.ok(embeddings.points.length > 0, "embeddings must have points");
  assert.equal(embeddings.points.length, embeddings.meta.count);

  for (const point of embeddings.points) {
    assert.ok(point.id);
    assert.ok(point.thumbnailUrl);
    assert.ok(point.x >= -1 && point.x <= 1, `x out of range for ${point.id}`);
    assert.ok(point.y >= -1 && point.y <= 1, `y out of range for ${point.id}`);
    assert.equal(
      Object.prototype.hasOwnProperty.call(point, "title"),
      false,
      "embeddings.json must not ship titles",
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(point, "href"),
      false,
      "embeddings.json must not ship hrefs",
    );
  }

  assert.equal(index.version, 1);
  assert.equal(index.items.length, embeddings.points.length);

  const joined = joinCorpusPoints(embeddings.points, index.items);
  assert.equal(
    joined.length,
    embeddings.points.length,
    "every embedding point must join to index metadata",
  );
}

assertManifest();
assertArtifacts();
console.log("verify:corpus OK");
