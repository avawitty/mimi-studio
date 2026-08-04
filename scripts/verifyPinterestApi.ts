import assert from "node:assert/strict";
import { parsePinterestBoardPath } from "../lib/pinterestApi.js";
import { parsePinterestBoardUrl } from "../lib/pinterestBoardPreview.js";

assert.equal(
  parsePinterestBoardPath("https://www.pinterest.com/mimi/editorial-reference/")?.boardSlug,
  "editorial-reference",
);
assert.equal(
  parsePinterestBoardPath("pinterest.com/mimi/editorial-reference/")?.username,
  "mimi",
);
assert.equal(parsePinterestBoardPath("https://www.pinterest.com/pin/123/"), null);

let rejectedUnsafeHost = false;
try {
  parsePinterestBoardUrl("http://127.0.0.1/private");
} catch {
  rejectedUnsafeHost = true;
}
assert.ok(rejectedUnsafeHost, "Non-Pinterest URLs must be rejected before server fetch");

const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
if (token) {
  const boards = await fetch(
    `${process.env.PINTEREST_API_BASE?.replace(/\/$/, "") || "https://api.pinterest.com/v5"}/boards?page_size=1`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    },
  );
  assert.ok(boards.ok, `Pinterest token smoke test failed (${boards.status})`);
  console.log("Pinterest API token smoke test: PASS");
} else {
  console.log("Pinterest API token smoke test: skipped (no PINTEREST_ACCESS_TOKEN)");
}

console.log("Pinterest API path parsing: PASS");
