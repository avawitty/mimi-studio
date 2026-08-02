/**
 * mimi.fish attention/share loop — offline verification.
 * Run: npm run verify:fish
 */
import assert from "node:assert/strict";
import {
  canonicalFishOrigin,
  getFishShareUrl,
  getSiteSkin,
  isFishHost,
  parseFishShareId,
  parseFishShelfHandle,
} from "../lib/siteHost";
import { getZineShareUrl } from "../lib/publicBaseUrl";

let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

check("fish host detection", () => {
  assert.equal(isFishHost("mimi.fish"), true);
  assert.equal(isFishHost("www.mimi.fish"), true);
  assert.equal(isFishHost("mimi.you"), false);
  assert.equal(getSiteSkin("mimi.fish"), "fish");
});

check("canonical share URL", () => {
  assert.equal(canonicalFishOrigin(), "https://mimi.fish");
  assert.equal(getFishShareUrl("abc123"), "https://mimi.fish/s/abc123");
  assert.equal(getZineShareUrl("abc123"), "https://mimi.fish/s/abc123");
  assert.equal(
    getZineShareUrl("abc123", "https://mimi.you"),
    "https://mimi.you/s/abc123",
  );
});

check("parse fish share + shelf paths", () => {
  assert.equal(parseFishShareId("/s/zine_1"), "zine_1");
  assert.equal(parseFishShareId("/zine/zine_1"), "zine_1");
  assert.equal(parseFishShareId("/u/ava"), null);
  assert.equal(parseFishShelfHandle("/u/ava"), "ava");
  assert.equal(parseFishShelfHandle("/ava"), "ava");
  assert.equal(parseFishShelfHandle("/studio"), null);
  assert.equal(parseFishShelfHandle("/s/x"), null);
});

console.log(`\nmimi.fish verify: ${passed} checks passed.`);
