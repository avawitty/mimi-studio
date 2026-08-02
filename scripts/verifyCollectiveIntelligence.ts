/**
 * Collective intelligence / Mean Median Mode verification.
 * Run: npm run verify:collective
 * No Firebase / network required.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCentralTendencyProfile,
  buildPublishConsent,
  mayContributeToMeanMedianMode,
  contributePublicZineToMeanMedianMode,
  loadMeanMedianModeReport,
  MMM_CONSENT_DISCLOSURE_VERSION,
  MMM_METHODOLOGY_VERSION,
  consentFieldsForZine,
  unpublishFieldsForZine,
} from "../services/collective";
import {
  centralTendencyProfileSchema,
  meanMedianModeReportSchema,
  safeParseProsceniumPublishConsent,
} from "../schemas/collectiveIntelligenceContracts";
import {
  OBSERVATORY_CHAMBER_MODULE_ID,
  OBSERVATORY_CHAMBER_ROUTE,
  MEAN_MEDIAN_MODE_MODULE_ID,
  MEAN_MEDIAN_MODE_ROUTE,
} from "../lib/observatoryChamberContract";
import { CANON_MODULES, canonicalizeMimiRoute } from "../lib/productCanon";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function testCentralTendencyMath() {
  const windowStart = 0;
  const windowEnd = 7 * 86400000;

  const insufficient = buildCentralTendencyProfile({
    signalId: "t:insufficient",
    windowStart,
    windowEnd,
    unit: "normalized_intensity",
    observations: [
      { value: 0.5, artifactId: "a1", contributorId: "c1", label: "alpha" },
      { value: 0.6, artifactId: "a2", contributorId: "c2", label: "alpha" },
    ],
  });
  assert(
    insufficient.summation.interpretation === "insufficient_evidence",
    "small sample → insufficient_evidence",
  );
  assert(insufficient.mode.label === "insufficient_evidence", "mode suppressed when insufficient");

  const spike = buildCentralTendencyProfile({
    signalId: "t:spike",
    windowStart,
    windowEnd,
    unit: "normalized_intensity",
    sourceTypeDiversity: 2,
    observations: [
      { value: 0.2, artifactId: "a1", contributorId: "c1", label: "calm" },
      { value: 0.2, artifactId: "a2", contributorId: "c2", label: "calm" },
      { value: 0.2, artifactId: "a3", contributorId: "c3", label: "calm" },
      { value: 0.2, artifactId: "a4", contributorId: "c4", label: "calm" },
      { value: 0.2, artifactId: "a5", contributorId: "c5", label: "calm" },
      { value: 0.2, artifactId: "a6", contributorId: "c6", label: "calm" },
      { value: 0.2, artifactId: "a7", contributorId: "c7", label: "calm" },
      { value: 0.2, artifactId: "a8", contributorId: "c8", label: "calm" },
      { value: 0.2, artifactId: "a9", contributorId: "c9", label: "calm" },
      { value: 2.0, artifactId: "a10", contributorId: "c10", label: "calm" },
    ],
  });
  assert(spike.mean > spike.median, "spike mean exceeds median");
  assert(spike.summation.interpretation === "spike_driven", "spike_driven interpretation");
  assert(spike.summation.skewHint === "mean_above_median", "skew hint");

  const contested = buildCentralTendencyProfile({
    signalId: "t:contested",
    windowStart,
    windowEnd,
    unit: "share_of_artifacts",
    sourceTypeDiversity: 2,
    observations: [
      { value: 0.5, artifactId: "a1", contributorId: "c1", label: "left" },
      { value: 0.5, artifactId: "a2", contributorId: "c2", label: "right" },
      { value: 0.5, artifactId: "a3", contributorId: "c3", label: "left" },
      { value: 0.5, artifactId: "a4", contributorId: "c4", label: "right" },
      { value: 0.5, artifactId: "a5", contributorId: "c5", label: "left" },
      { value: 0.5, artifactId: "a6", contributorId: "c6", label: "right" },
      { value: 0.5, artifactId: "a7", contributorId: "c7", label: "left" },
      { value: 0.5, artifactId: "a8", contributorId: "c8", label: "right" },
      { value: 0.5, artifactId: "a9", contributorId: "c9", label: "left" },
      { value: 0.5, artifactId: "a10", contributorId: "c10", label: "right" },
    ],
  });
  assert(
    contested.summation.interpretation === "contested",
    "bimodal labels → contested",
  );
  assert(
    contested.summation.modality === "bimodal" || contested.summation.modality === "multimodal",
    "modality reflects split",
  );

  const sameSample = buildCentralTendencyProfile({
    signalId: "t:same",
    windowStart,
    windowEnd,
    unit: "normalized_intensity",
    sourceTypeDiversity: 2,
    observations: Array.from({ length: 10 }, (_, i) => ({
      value: 0.4 + (i % 3) * 0.05,
      artifactId: `a${i}`,
      contributorId: `c${i}`,
      label: i % 2 === 0 ? "shared" : "shared",
    })),
  });
  const parsed = centralTendencyProfileSchema.parse(sameSample);
  assert(parsed.sampleSize === 10, "sample size from same window");
  assert(parsed.methodologyVersion === MMM_METHODOLOGY_VERSION, "methodology version");
}

function testConsent() {
  assert(!mayContributeToMeanMedianMode(null), "null consent → no contribute");
  assert(
    !mayContributeToMeanMedianMode({
      contributeToMeanMedianMode: true,
    }),
    "contribute flag without disclosure → no",
  );
  assert(
    !mayContributeToMeanMedianMode({
      disclosedAt: Date.now(),
      disclosureVersion: MMM_CONSENT_DISCLOSURE_VERSION,
      contributeToMeanMedianMode: false,
    }),
    "opt-out → no",
  );
  assert(
    mayContributeToMeanMedianMode({
      disclosedAt: Date.now(),
      disclosureVersion: MMM_CONSENT_DISCLOSURE_VERSION,
      contributeToMeanMedianMode: true,
    }),
    "disclosure + contribute → yes",
  );

  const consent = buildPublishConsent({
    artifactId: "z1",
    contributeToMeanMedianMode: true,
  });
  const ok = safeParseProsceniumPublishConsent(consent);
  assert(ok.success, "consent schema");
  assert(consent.disclosureVersion === MMM_CONSENT_DISCLOSURE_VERSION, "disclosure version");

  const fields = consentFieldsForZine(consent);
  assert(fields.isPublic === true, "consent fields stage public");
  assert(fields.contributeToMeanMedianMode === true, "consent fields contribute");

  const unpub = unpublishFieldsForZine();
  assert(unpub.isPublic === false && unpub.contributeToMeanMedianMode === false, "unpublish stops");
}

function testContributePipeline() {
  const denied = contributePublicZineToMeanMedianMode({
    id: "private-1",
    isPublic: true,
    contributeToMeanMedianMode: false,
    tags: ["should-not-extract"],
    disclosedAt: Date.now(),
    disclosureVersion: MMM_CONSENT_DISCLOSURE_VERSION,
  });
  assert(denied.signals.length === 0, "opt-out produces no signals");
  assert(denied.receipt?.exclusionReasons.includes("no_consent_or_opt_out"), "receipt exclusion");

  const noDisclosure = contributePublicZineToMeanMedianMode({
    id: "silent-1",
    isPublic: true,
    contributeToMeanMedianMode: true,
    tags: ["leak"],
  });
  assert(noDisclosure.signals.length === 0, "no disclosure → no signals");

  const ok = contributePublicZineToMeanMedianMode({
    id: "public-1",
    isPublic: true,
    contributeToMeanMedianMode: true,
    tags: ["Twilight", "Archive"],
    theme: "Observatory",
    tone: "essay",
    disclosedAt: Date.now(),
    disclosureVersion: MMM_CONSENT_DISCLOSURE_VERSION,
  });
  assert(ok.signals.length >= 3, "tags + theme + tone extract");
  assert(
    ok.signals.every((s) => s.anonymizationStatus === "eligible"),
    "eligible status",
  );
  assert(!ok.signals.some((s) => s.contextExcerpt), "no private excerpts");
  assert(ok.receipt?.contributedSignalIds.length === ok.signals.length, "receipt ids");
}

function testReportFixture() {
  const demo = loadMeanMedianModeReport("demonstration");
  const parsed = meanMedianModeReportSchema.parse(demo);
  assert(parsed.demonstration === true, "demo flagged");
  assert(parsed.status === "demonstration", "demo status");
  assert(parsed.whatMayBeMissing.length >= 1, "required missing section");
  assert(parsed.profiles.length >= 1, "demo has profiles");
  for (const profile of parsed.profiles) {
    assert(
      typeof profile.mean === "number" &&
        typeof profile.median === "number" &&
        typeof profile.mode.label === "string",
      "mean median mode first-class",
    );
  }

  const empty = loadMeanMedianModeReport("empty");
  assert(empty.status === "empty", "empty status");
  assert(empty.profiles.length === 0, "empty has no profiles");
}

function testNamespaceSeparation() {
  const residueValidation = fs.readFileSync(
    path.join(root, "services/residue/validation.ts"),
    "utf8",
  );
  assert(
    residueValidation.includes("meanMedianModeResultSchema"),
    "residue keeps its own MMM schema",
  );
  const collectiveSchema = fs.readFileSync(
    path.join(root, "schemas/collectiveIntelligenceContracts.ts"),
    "utf8",
  );
  assert(
    collectiveSchema.includes("centralTendencyProfileSchema"),
    "collective uses CentralTendencyProfile",
  );
  assert(
    !collectiveSchema.includes("analysisKind"),
    "collective schema is not Residue narrative MMM",
  );
}

function testCanonAndFiles() {
  assert(
    canonicalizeMimiRoute("observatory") === "observatory",
    "observatory route",
  );
  assert(
    canonicalizeMimiRoute("mean-median-mode") === "mean-median-mode",
    "mmm route",
  );
  assert(canonicalizeMimiRoute("mmm") !== "observatory", "short mmm does not alias observatory");
  assert(canonicalizeMimiRoute("mmm") !== "mean-median-mode", "short mmm stays off collective");

  const observatory = CANON_MODULES.find((m) => m.id === OBSERVATORY_CHAMBER_MODULE_ID);
  const mmm = CANON_MODULES.find((m) => m.id === MEAN_MEDIAN_MODE_MODULE_ID);
  assert(observatory, "observatory canon module");
  assert(mmm, "mean-median-mode canon module");
  assert(observatory!.canonicalRoute === OBSERVATORY_CHAMBER_ROUTE, "observatory route path");
  assert(mmm!.canonicalRoute === MEAN_MEDIAN_MODE_ROUTE, "mmm route path");
  assert(!observatory!.aliases.includes("MMM"), "observatory does not steal Residue MMM alias");
  assert(!mmm!.aliases.includes("MMM"), "collective module avoids short MMM alias");

  const residue = CANON_MODULES.find((m) => m.id === "residue");
  assert(residue?.aliases.includes("MMM"), "Residue retains MMM alias");

  const requiredFiles = [
    "schemas/collectiveIntelligenceContracts.ts",
    "services/collective/aggregateCentralTendency.ts",
    "services/collective/consent.ts",
    "components/chambers/ObservatoryChamber.tsx",
    "components/observatory/MeanMedianModePanel.tsx",
    "components/proscenium/ProsceniumPublishConsentModal.tsx",
    "lib/observatoryChamberContract.ts",
    "fixtures/collective/demoMeanMedianModeReport.ts",
  ];
  for (const rel of requiredFiles) {
    assert(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }

  const legal = fs.readFileSync(path.join(root, "components/LegalOverlay.tsx"), "utf8");
  assert(legal.includes("Mean Median Mode"), "legal names Mean Median Mode");
  assert(!legal.includes("Social Floor"), "legal drops Social Floor label");
}

function main() {
  testCentralTendencyMath();
  testConsent();
  testContributePipeline();
  testReportFixture();
  testNamespaceSeparation();
  testCanonAndFiles();
  console.log("verify:collective PASS");
}

main();
