/**
 * Residue Engine Phase 2 verification — schemas, scoring, provenance, safety, storage.
 * Run: npx tsx scripts/verifyResidueEngine.ts
 * No Firebase / Apify network required.
 */

import {
  APIFY_ACTOR_CANDIDATES,
  ApifySourceAcquisitionProvider,
  ManualSourceProvider,
  RESIDUE_SCHEMA_VERSION,
  buildConfidenceSummary,
  buildResidueRunDocument,
  buildSourceManifest,
  buildUsedContext,
  claimConfidenceFromEvidence,
  claimProvenanceDisclosure,
  containsForbiddenEmotionalLanguage,
  createMemoryResidueStore,
  createRunMetadata,
  culturalResidueResultSchema,
  emotionalResidueResultSchema,
  emotionalSafetyNotice,
  flagsForClaim,
  hashResidueInput,
  layerForSourceType,
  literalMean,
  literalMedian,
  literalMode,
  meanMedianModeResultSchema,
  redactSensitiveText,
  safeParseCulturalResidueResult,
  sanitizeEmotionalStatement,
  sourceQualityScore,
} from "../services/residue/index";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = "2026-07-29T19:00:00.000Z";

function fixtureCultural() {
  const sources = [
    {
      sourceId: "src_1",
      title: "Office Siren Explainer",
      url: "https://example.com/office-siren",
      sourceType: "journalism" as const,
      accessedAt: now,
      evidenceLayer: "B" as const,
      excerpt: "The look migrated from niche TikTok edits into retail lookbooks.",
    },
    {
      sourceId: "src_2",
      title: "Subreddit discussion",
      sourceType: "reddit" as const,
      accessedAt: now,
      evidenceLayer: "C" as const,
      excerpt: "People report seeing the silhouette everywhere at work.",
    },
  ];

  const evidence = [
    {
      evidenceId: "ev_1",
      sourceId: "src_1",
      claimSupported: "Office siren amplified on short-form video platforms.",
      excerpt: "migrated from niche TikTok edits",
      evidenceStrength: "moderate" as const,
      sourceQualityScore: 0.7,
      relevanceScore: 0.9,
      limitations: ["Secondary journalism summary"],
      evidenceLayer: "B" as const,
    },
    {
      evidenceId: "ev_2",
      sourceId: "src_2",
      claimSupported: "Community reports workplace adoption.",
      evidenceStrength: "weak" as const,
      sourceQualityScore: 0.4,
      relevanceScore: 0.6,
      limitations: ["Anecdotal community report"],
      evidenceLayer: "C" as const,
    },
  ];

  const definition = {
    claimId: "cl_def",
    statement:
      "Office siren names a Y2K-adjacent corporate-sexy silhouette circulating on social platforms.",
    status: "interpretive" as const,
    evidenceIds: ["ev_1", "ev_2"],
    counterEvidenceIds: [] as string[],
    confidence: 0.62,
    uncertaintyFlags: ["missing-countersignals"],
    evidenceLayers: ["B", "C"] as Array<"B" | "C">,
  };

  const confidenceSummary = buildConfidenceSummary({
    evidence,
    sources,
    primaryClaims: [definition],
    counterClaims: [],
  });

  return culturalResidueResultSchema.parse({
    metadata: createRunMetadata({
      runId: "run_cultural_fixture",
      mode: "cultural",
      inputHash: hashResidueInput(["office siren", "cultural"]),
      sourceCount: sources.length,
      warnings: [],
      status: "complete",
      retention: "temporary",
      consentToStore: false,
      createdAt: now,
    }),
    query: "office siren",
    definition,
    origins: [],
    lineage: [
      {
        stageId: "st_1",
        label: "Amplification",
        stage: "amplification",
        startYear: 2022,
        description: "Short-form circulation increased visibility of the silhouette.",
        evidenceIds: ["ev_1"],
        confidence: 0.55,
      },
    ],
    descendants: [],
    culturalCodes: [
      {
        codeId: "code_1",
        category: "visual",
        label: "Low-rise pencil skirt + thin knit",
        description: "Recurring wardrobe code in look roundups.",
        evidenceIds: ["ev_1"],
        confidence: 0.5,
      },
    ],
    associations: [],
    survivingMeanings: [],
    lostMeanings: [],
    computationallyIntroducedMeanings: [
      {
        claimId: "cl_model",
        statement: "Possible link to earlier secretary-chic media tropes (model-proposed).",
        status: "model-proposed",
        evidenceIds: [],
        counterEvidenceIds: [],
        confidence: 0.2,
        uncertaintyFlags: ["model-proposed-without-evidence"],
        evidenceLayers: ["D"],
      },
    ],
    commercialAbsorption: [],
    counterSignals: [],
    evidence,
    sources,
    usedContext: buildUsedContext({ sources, evidence }),
    confidenceSummary,
    evidenceGaps: ["Missing primary archival sources for prehistory."],
  });
}

function fixtureEmotional() {
  const sources = [
    {
      sourceId: "src_r1",
      title: "Review article on envy research",
      sourceType: "academic-research" as const,
      accessedAt: now,
      evidenceLayer: "A" as const,
    },
    {
      sourceId: "src_c1",
      title: "Forum thread",
      sourceType: "forum" as const,
      accessedAt: now,
      evidenceLayer: "C" as const,
    },
  ];
  const evidence = [
    {
      evidenceId: "ev_r1",
      sourceId: "src_r1",
      claimSupported: "Research discusses social comparison processes.",
      evidenceStrength: "strong" as const,
      sourceQualityScore: 0.95,
      relevanceScore: 0.8,
      limitations: ["General research; not individualized"],
      evidenceLayer: "A" as const,
    },
  ];

  const neighborhood = {
    neighborhoodId: "nb_1",
    label: "Social comparison discomfort",
    description:
      "One possible interpretive neighborhood is social comparison discomfort reported across research and community language.",
    relevanceScore: 0.7,
    scoreMeaning: "evidence-supported-relevance" as const,
    status: "research-supported" as const,
    evidenceIds: ["ev_r1"],
    distinctions: ["Distinct from clinical diagnosis labels"],
    uncertaintyFlags: [] as string[],
  };

  const confidenceSummary = buildConfidenceSummary({
    evidence,
    sources,
    primaryClaims: [],
    counterClaims: [],
  });

  return emotionalResidueResultSchema.parse({
    metadata: createRunMetadata({
      runId: "run_emotional_fixture",
      mode: "emotional",
      inputHash: hashResidueInput(["jealousy", "emotional"]),
      sourceCount: sources.length,
      createdAt: now,
      status: "complete",
      retention: "temporary",
      consentToStore: false,
    }),
    inputExperience: "jealousy",
    normalizedExperience: "jealousy / envy-adjacent reported experience",
    interpretiveNeighborhoods: [neighborhood],
    neighboringFeelings: [],
    commonTriggers: [],
    commonInterpretations: [],
    alternativeInterpretations: [],
    bodilySensations: [],
    commonBehaviors: [],
    internetExpressions: [],
    historicalExpressions: [],
    therapeuticModels: [],
    communityPatterns: [],
    cognitivePatterns: [],
    adaptiveResponses: [],
    potentiallyUnhelpfulResponses: [],
    uncertaintyFlags: ["sensitive-emotional-input"],
    evidence,
    sources,
    usedContext: buildUsedContext({ sources, evidence }),
    confidenceSummary,
    evidenceGaps: ["Limited memoir sources in fixture."],
    safetyNotice: emotionalSafetyNotice(),
  });
}

async function main() {
  console.log("MIMI // Residue Engine Phase 2 verification");

  // Layer mapping
  assert(layerForSourceType("academic-research") === "A", "academic → A");
  assert(layerForSourceType("reddit") === "C", "reddit → C");
  assert(layerForSourceType("model-proposed") === "D", "model → D");
  assert(sourceQualityScore("academic-research", "strong") > sourceQualityScore("reddit", "weak"), "quality ordering");

  // Cultural fixture validates
  const cultural = fixtureCultural();
  assert(cultural.metadata.schemaVersion === RESIDUE_SCHEMA_VERSION, "schema version");
  assert(safeParseCulturalResidueResult(cultural).success, "cultural safeParse");
  const modelClaim = cultural.computationallyIntroducedMeanings[0];
  const disclosure = claimProvenanceDisclosure(modelClaim);
  assert(disclosure.isModelProposed, "model-proposed disclosure");

  // Emotional fixture + safety
  const emotional = fixtureEmotional();
  assert(emotional.safetyNotice.includes("does not determine"), "safety notice");
  assert(containsForbiddenEmotionalLanguage("You are depressed"), "forbidden detect");
  assert(
    sanitizeEmotionalStatement("You are depressed").includes("hypothesis for reflection"),
    "sanitize forbidden",
  );
  assert(redactSensitiveText("I feel guilty when people like me") === "[redacted-emotional-input]", "redact");

  // Uncertainty flags
  const flags = flagsForClaim({
    status: "model-proposed",
    evidence: [],
  });
  assert(flags.includes("model-proposed-without-evidence"), "uncertainty flag");

  // Scoring / literal MMM
  const conf = buildConfidenceSummary({
    evidence: cultural.evidence,
    sources: cultural.sources,
    primaryClaims: [cultural.definition],
    counterClaims: [],
  });
  assert(conf.overallConfidence >= 0 && conf.overallConfidence <= 1, "confidence bounds");
  assert(conf.summary.includes("not a diagnostic likelihood"), "confidence label");
  assert(literalMean([1, 2, 3]) === 2, "literal mean");
  assert(literalMedian([1, 2, 100]) === 2, "literal median");
  assert(literalMode(["a", "b", "a"])?.value === "a", "literal mode");

  const mmm = meanMedianModeResultSchema.parse({
    subject: "office siren meanings",
    analysisKind: "interpretive-metaphor",
    mean: {
      synthesis: "Blended center across journalism and community reports.",
      contributingSignalIds: ["ev_1", "ev_2"],
      caveats: ["Interpretive metaphor, not a numeric average of culture."],
    },
    median: {
      centralPosition: "Platform-amplified corporate-sexy silhouette.",
      excludedOrDownweightedOutliers: ["Fringe parody-only readings"],
      contributingSignalIds: ["ev_1"],
    },
    mode: {
      dominantPattern: "TikTok-to-retail circulation narrative",
      frequency: 2,
      contributingSignalIds: ["ev_1", "ev_2"],
    },
    outliers: [],
    counterMode: [],
    spread: { level: "medium", description: "Journalism and community language partially align." },
    confidence: conf,
  });
  assert(mmm.analysisKind === "interpretive-metaphor", "mmm kind");

  // Provenance / used context / manifest
  const manifest = buildSourceManifest(cultural.sources);
  assert(manifest.byLayer.B === 1 && manifest.byLayer.C === 1, "manifest layers");
  assert(cultural.usedContext.some((e) => e.usage === "evidence"), "used context evidence");

  // Claim confidence
  const c = claimConfidenceFromEvidence(cultural.evidence, "interpretive");
  assert(c > 0 && c <= 1, "claim confidence");

  // Acquisition stubs
  const manual = new ManualSourceProvider();
  const manualResult = await manual.acquire({
    inquiry: "office siren",
    mode: "cultural",
    sourceUrls: ["https://example.com/a"],
    maxItems: 10,
  });
  assert(manualResult.status === "partial", "manual acquisition");

  const apify = new ApifySourceAcquisitionProvider();
  const apifyResult = await apify.acquire({
    inquiry: "office siren",
    mode: "cultural",
    maxItems: 10,
  });
  assert(apifyResult.status === "disabled", "apify disabled without live Phase 9 client");
  assert(APIFY_ACTOR_CANDIDATES.reddit.includes("reddit"), "actor registry");

  // Memory store: artifact delete does not delete run
  const store = createMemoryResidueStore();
  const runDoc = buildResidueRunDocument({
    runId: "run_store_1",
    ownerUid: "user_test",
    mode: "cultural",
    status: "complete",
    retention: "persisted",
    consentToStore: true,
    inputHash: hashResidueInput(["x"]),
    queryOrExperience: "office siren",
    sourceCount: 2,
    confidenceSummary: conf,
  });
  await store.saveRun(runDoc);
  await store.saveArtifact("user_test", {
    artifactId: "art_1",
    runId: "run_store_1",
    kind: "intelligence-report",
    payload: { ok: true },
  });
  await store.deleteArtifact("user_test", "art_1");
  const stillThere = await store.getRun("user_test", "run_store_1");
  assert(stillThere?.runId === "run_store_1", "run survives artifact delete");

  // Temporary without consent is not retained in memory store
  const temp = buildResidueRunDocument({
    runId: "run_temp",
    ownerUid: "user_test",
    mode: "emotional",
    status: "complete",
    retention: "temporary",
    consentToStore: false,
    inputHash: hashResidueInput(["y"]),
    queryOrExperience: "should redact",
    sourceCount: 0,
    sensitive: true,
  });
  assert(temp.queryOrExperience === "[redacted-emotional-input]", "emotional store redaction");
  await store.saveRun(temp);
  assert((await store.getRun("user_test", "run_temp")) === null, "temporary unconsented not stored");

  // Reject hallucinated historical certainty without evidence
  const bad = {
    ...cultural,
    definition: {
      ...cultural.definition,
      status: "historical",
      evidenceIds: [] as string[],
      confidence: 0.99,
    },
  };
  // Schema still allows the shape; provenance disclosure must mark model/under-supported.
  const badDisclosure = claimProvenanceDisclosure(bad.definition as typeof cultural.definition);
  assert(badDisclosure.isModelProposed, "no-evidence historical treated as under-supported");

  console.log("OK — Residue Phase 2 checks passed.");
}

main().catch((err) => {
  console.error("FAIL — Residue Phase 2 verification:", err);
  process.exit(1);
});
