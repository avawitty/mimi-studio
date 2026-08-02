/**
 * Mimi Shell staple prompt — offline verification.
 * Run: npm run verify:doll-staple
 */
import assert from "node:assert/strict";
import {
  MIMI_SHELL_STAPLE,
  MIMI_SHELL_STAPLE_VERSION,
  buildMimiShellCompanionContext,
  buildMimiShellImagePrompt,
} from "../services/dollEngine";
import type { Doll } from "../types";

const sample = {
  name: "Atelier Proxy",
  visualLanguage: ["architectural black", "flash photography"],
  materials: ["structured blazer", "tulle"],
  motifs: ["runway"],
  signatureMotifs: [],
  palette: ["ink", "blush"],
  silhouette: "elongated column",
  eyeTreatment: "hazel crystal iris",
  emotionalRegister: "composed",
  creativePhilosophy: "front-row restraint",
} as Pick<
  Doll,
  | "name"
  | "visualLanguage"
  | "materials"
  | "motifs"
  | "signatureMotifs"
  | "palette"
  | "silhouette"
  | "eyeTreatment"
  | "emotionalRegister"
  | "creativePhilosophy"
>;

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

check("staple version + locked anatomy", () => {
  assert.equal(MIMI_SHELL_STAPLE.version, "shell-v1");
  assert.match(MIMI_SHELL_STAPLE.proportions, /elongated slender neck/i);
  assert.match(MIMI_SHELL_STAPLE.medium, /BJD|ball-jointed/i);
  assert.match(MIMI_SHELL_STAPLE.face, /serene/i);
});

check("portrait prompt keeps house lock + taste accents", () => {
  const prompt = buildMimiShellImagePrompt(sample, { view: "portrait" });
  assert.match(prompt, new RegExp(MIMI_SHELL_STAPLE_VERSION));
  assert.match(prompt, /elongated slender neck/i);
  assert.match(prompt, /porcelain/i);
  assert.match(prompt, /structured blazer/i);
  assert.match(prompt, /Atelier Proxy/);
  assert.match(prompt, /Avoid:/i);
  assert.doesNotMatch(prompt, /photoreal human skin pores.*LOCKED/i);
});

check("scenario + posture slots", () => {
  const prompt = buildMimiShellImagePrompt(sample, {
    view: "full_body",
    posture: "THE GAZE — still, forward, chin lifted",
    scenario: "front row of a Paris runway, avant-garde black blazer and tulle, flash photography",
  });
  assert.match(prompt, /THE GAZE/);
  assert.match(prompt, /Paris runway/i);
  assert.match(prompt, /full-body/i);
});

check("companion context species lock", () => {
  const ctx = buildMimiShellCompanionContext(sample);
  assert.match(ctx, /MIMI SHELL/);
  assert.match(ctx, /Never render as a photoreal human/i);
  assert.match(ctx, /elongated slender neck/i);
});

console.log(`\ndoll staple verify: ${passed} checks passed.`);
