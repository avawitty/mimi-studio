import assert from "node:assert/strict";
import { resolveAuthDomain } from "../lib/resolveAuthDomain";

assert.equal(resolveAuthDomain(undefined, "www.mimi.you"), "www.mimi.you");
assert.equal(resolveAuthDomain(undefined, "mimi.you"), "mimi.you");
assert.equal(resolveAuthDomain(undefined, "www.mimi.rip"), "www.mimi.rip");
assert.equal(resolveAuthDomain(undefined, "mimi.rip"), "mimi.rip");
assert.equal(resolveAuthDomain(undefined, "localhost"), "mimistudios.firebaseapp.com");
assert.equal(
  resolveAuthDomain(undefined, "random-preview.vercel.app"),
  "mimistudios.firebaseapp.com",
);
assert.equal(
  resolveAuthDomain(undefined, "mimi-studio-gateway.vercel.app"),
  "mimi-studio-gateway.vercel.app",
);
assert.equal(resolveAuthDomain("custom.example.com", "www.mimi.you"), "custom.example.com");

console.log("resolveAuthDomain checks passed");
