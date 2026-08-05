import assert from "node:assert/strict";
import { compileStockSearchQuery } from "../lib/unsplashClient.js";

assert.equal(
  compileStockSearchQuery("  linen drapery, morning light\nCopenhagen editorial  "),
  "linen drapery, morning light Copenhagen editorial",
);

const trimmed = compileStockSearchQuery(
  "one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
);
assert.ok(trimmed.split(" ").length <= 12, "search query should cap word count");

console.log("Inspo stock query compilation: PASS");
