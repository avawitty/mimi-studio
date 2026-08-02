import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DESKTOP_PLATE_CONCURRENCY,
  editorAssetUrl,
  exportAssetUrl,
  fullFidelityPageIndexes,
  resolvePlateConcurrency,
} from "../lib/zine/zinePerformance";
import { makeLegacyPages } from "./fixtures/zineArtifactFixture";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

assert.deepEqual([...fullFidelityPageIndexes(4, 10)], [3, 4, 5]);
assert.equal(resolvePlateConcurrency(99), DESKTOP_PLATE_CONCURRENCY);
assert.equal(resolvePlateConcurrency(undefined, true), 2);
assert.equal(resolvePlateConcurrency(99, true), 2);

const page = makeLegacyPages()[0];
assert.equal(editorAssetUrl(page), "https://cdn.example.test/preview.jpg");
assert.equal(exportAssetUrl(page), "https://cdn.example.test/master.jpg");

const proof = read("components/zine/ZineProofMode.tsx");
assert.match(proof, /fullFidelityPageIndexes/);
assert.match(proof, /\[\.\.\.fullFidelityIndexes\]\.map/);

const bake = read("lib/bakeZinePlates.ts");
assert.match(bake, /MAX_BAKE_PLATES\s*=\s*24/);
assert.match(bake, /slice\(0,\s*MAX_BAKE_PLATES\)/);
assert.match(bake, /resolvePlateConcurrency/);

const editor = read("components/ZineLayoutEditor.tsx");
const pointerMoveStart = editor.indexOf("const handlePointerMove");
const pointerMoveEnd = editor.indexOf("const handlePointerUp", pointerMoveStart);
assert.ok(pointerMoveStart >= 0 && pointerMoveEnd > pointerMoveStart);
assert.doesNotMatch(
  editor.slice(pointerMoveStart, pointerMoveEnd),
  /onSave\(/,
  "drag feedback must not persist on each pointer move",
);

console.log("✓ Mimi zine performance budget verified");
console.log("  - active + adjacent full-fidelity mounting");
console.log("  - preview/master asset split and bounded plate queue");
console.log("  - drag persistence deferred until interaction completion");
