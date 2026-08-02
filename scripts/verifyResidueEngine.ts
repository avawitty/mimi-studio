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
  adaptResidueToMeanMedianMode,
  buildLiteralMeanMedianMode,
  runCulturalResidue,
  runEmotionalResidue,
  safeParseCulturalResidueResult,
  sanitizeEmotionalStatement,
  separateResearchFromCommunityReports,
  sourceQualityScore,
  toMeanMedianMode,
} from "../services/residue/index";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = "2026-07-29T19:00:00.000Z";

function fixtureCultural() {
  const sources = [
    {
      sourceId: "src_1",
      title: "Indie Sleaze Explainer",
      url: "https://example.com/indie-sleaze",
      sourceType: "journalism" as const,
      accessedAt: now,
      evidenceLayer: "B" as const,
      excerpt: "The look migrated from niche party blogs into short-form revival edits and retail capsules.",
    },
    {
      sourceId: "src_2",
      title: "Subreddit discussion",
      sourceType: "reddit" as const,
      accessedAt: now,
      evidenceLayer: "C" as const,
      excerpt: "People report seeing flash photography and thrifted partywear everywhere again.",
    },
  ];

  const evidence = [
    {
      evidenceId: "ev_1",
      sourceId: "src_1",
      claimSupported: "Indie sleaze amplified on short-form revival platforms.",
      excerpt: "migrated from niche party blogs",
      evidenceStrength: "moderate" as const,
      sourceQualityScore: 0.7,
      relevanceScore: 0.9,
      limitations: ["Secondary journalism summary"],
      evidenceLayer: "B" as const,
    },
    {
      evidenceId: "ev_2",
      sourceId: "src_2",
      claimSupported: "Community reports nightlife revival adoption.",
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
      "Indie sleaze names a 2010s-adjacent nightlife aesthetic circulating again across social platforms.",
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
      inputHash: hashResidueInput(["indie sleaze", "cultural"]),
      sourceCount: sources.length,
      warnings: [],
      status: "complete",
      retention: "temporary",
      consentToStore: false,
      createdAt: now,
    }),
    query: "indie sleaze",
    definition,
    origins: [],
    lineage: [
      {
        stageId: "st_1",
        label: "Amplification",
        stage: "amplification",
        startYear: 2022,
        description: "Short-form revival circulation increased visibility of the look.",
        evidenceIds: ["ev_1"],
        confidence: 0.55,
      },
    ],
    descendants: [],
    culturalCodes: [
      {
        codeId: "code_1",
        category: "visual",
        label: "Flash photography + thrifted partywear",
        description: "Recurring visual codes in look roundups.",
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
        statement: "Possible link to earlier adjacent nightlife media tropes (model-proposed).",
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
    subject: "indie sleaze meanings",
    analysisKind: "interpretive-metaphor",
    mean: {
      synthesis: "Blended center across journalism and community reports.",
      contributingSignalIds: ["ev_1", "ev_2"],
      caveats: ["Interpretive metaphor, not a numeric average of culture."],
    },
    median: {
      centralPosition: "Platform-amplified nightlife revival aesthetic.",
      excludedOrDownweightedOutliers: ["Fringe parody-only readings"],
      contributingSignalIds: ["ev_1"],
    },
    mode: {
      dominantPattern: "Short-form-to-retail circulation narrative",
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
    inquiry: "indie sleaze",
    mode: "cultural",
    sourceUrls: ["https://example.com/a"],
    maxItems: 10,
  });
  assert(manualResult.status === "partial", "manual acquisition");

  const apify = new ApifySourceAcquisitionProvider();
  const apifyResult = await apify.acquire({
    inquiry: "indie sleaze",
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
    queryOrExperience: "indie sleaze",
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

  // --- Phase 3: Cultural Residue engine (offline / no gateway required) ---
  const engineOut = await runCulturalResidue(
    {
      query: "indie sleaze",
      researchQuestion: "How did indie sleaze travel from niche nightlife media into retail?",
      sourceUrls: ["https://example.com/indie-sleaze-explainer"],
      userNotes: [
        "Indie sleaze emerged from party blogs and nightlife photography, then amplified on short-form revival feeds.",
        "Retail lookbooks absorbed the thrifted partywear codes; some users now report fatigue and backlash.",
        "Possible descent from earlier club-kid and digicam party cultures remains partly speculative.",
      ],
      analysisDepth: "standard",
      retention: "temporary",
      consentToStore: false,
    },
    {
      llm: { offline: true },
      runId: "run_indie_sleaze_offline",
      now,
    },
  );

  assert(engineOut.usedLlm === false, "offline engine does not call LLM");
  assert(engineOut.result.query.toLowerCase().includes("indie sleaze"), "query preserved");
  assert(engineOut.result.evidence.length > 0, "engine extracted evidence");
  assert(engineOut.result.lineage.length > 0, "engine built lineage");
  assert(engineOut.result.culturalCodes.length > 0, "engine detected cultural codes");
  assert(
    engineOut.result.computationallyIntroducedMeanings.some((c) => c.status === "model-proposed" || c.evidenceIds.length > 0),
    "computational residue present",
  );
  assert(
    engineOut.result.associations.some((a) => a.status === "model-proposed"),
    "model-proposed associations remain labeled",
  );
  assert(engineOut.result.usedContext.length > 0, "used context built");
  assert(
    engineOut.result.confidenceSummary.summary.includes("not a diagnostic likelihood"),
    "confidence narrative labeled",
  );
  assert(engineOut.partial.completedStages.includes("synthesize"), "synthesize stage completed");
  assert(
    culturalResidueResultSchema.safeParse(engineOut.result).success,
    "engine result validates",
  );

  // Hallucinated citation prevention: unknown source IDs must not appear as evidence sources
  const sourceIds = new Set(engineOut.result.sources.map((s) => s.sourceId));
  for (const ev of engineOut.result.evidence) {
    assert(sourceIds.has(ev.sourceId), `evidence source exists: ${ev.sourceId}`);
  }

  // --- Phase 4: Emotional Residue engine (offline / non-diagnostic) ---
  const emotionalCases = [
    "jealousy",
    "feeling left behind",
    "creative shame",
    "I feel guilty when people like me",
    "I cannot stop checking their Instagram",
    "I think everyone secretly hates me",
  ];

  for (const experience of emotionalCases) {
    const out = await runEmotionalResidue(
      {
        experience,
        userNotes: [
          "Forum posts mention checking profiles after seeing friends succeed.",
          "A review article discusses social comparison without diagnosing readers.",
        ],
        sourceUrls: ["https://example.com/social-comparison-review"],
        includeCommunitySources: true,
        includeResearchSources: true,
        retention: "temporary",
        consentToStore: false,
      },
      {
        llm: { offline: true },
        runId: `run_em_${experience.slice(0, 12).replace(/\s+/g, "_")}`,
        now,
        sources: [
          {
            sourceId: "src_research_1",
            title: "Social comparison review",
            url: "https://example.com/social-comparison-review",
            sourceType: "academic-research",
            accessedAt: now,
            evidenceLayer: "A",
            excerpt:
              "Research discusses social comparison processes and reported envy-adjacent experiences.",
          },
          {
            sourceId: "src_forum_1",
            title: "Forum thread",
            sourceType: "forum",
            accessedAt: now,
            evidenceLayer: "C",
            excerpt:
              "People describing similar experiences often mention checking Instagram and feeling left behind.",
            metadata: {
              fullText:
                "People describing similar experiences often mention checking Instagram. Creative shame shows up when posting work. Some say they feel guilty when people like them.",
            },
          },
        ],
      },
    );

    assert(out.usedLlm === false, `offline emotional (${experience})`);
    assert(out.result.interpretiveNeighborhoods.length >= 2, `multiple neighborhoods (${experience})`);
    assert(
      out.result.safetyNotice.toLowerCase().includes("does not") ||
        out.result.safetyNotice.toLowerCase().includes("diagnosis"),
      `safety notice (${experience})`,
    );
    assert(
      !containsForbiddenEmotionalLanguage(
        out.result.interpretiveNeighborhoods.map((n) => n.description).join(" "),
      ),
      `no forbidden diagnosis language (${experience})`,
    );
    assert(
      out.result.confidenceSummary.summary.includes("not a diagnostic likelihood"),
      `confidence labeled (${experience})`,
    );
    assert(out.result.inputExperience === "[redacted-emotional-input]", `redacted input (${experience})`);

    const split = separateResearchFromCommunityReports({
      sources: out.result.sources,
      evidence: out.result.evidence,
    });
    assert(split.researchEvidence.length >= 1, `research distinct (${experience})`);
    assert(split.communityEvidence.length >= 1, `community distinct (${experience})`);
  }

  // Belief-validation guard: unsupported mind-reading stays non-confirmatory
  const mindRead = await runEmotionalResidue(
    {
      experience: "I think everyone secretly hates me",
      retention: "temporary",
      consentToStore: false,
      userNotes: ["No corroborating research in notes."],
    },
    { llm: { offline: true }, now },
  );
  const joined = [
    ...mindRead.result.commonInterpretations.map((c) => c.statement),
    ...mindRead.result.alternativeInterpretations.map((c) => c.statement),
    ...mindRead.result.interpretiveNeighborhoods.map((n) => n.description),
  ].join(" ");
  assert(!/this proves|you are|reddit confirms/i.test(joined), "no belief-confirmation language");
  assert(
    mindRead.result.alternativeInterpretations.length +
      mindRead.result.interpretiveNeighborhoods.length >=
      2,
    "offers alternatives / multiple neighborhoods",
  );

  // --- Phase 5: Mean / Median / Mode adapter ---
  const culturalEngine = await runCulturalResidue(
    {
      query: "indie sleaze",
      userNotes: [
        "Indie sleaze revived on short-form feeds with flash photography codes.",
        "Retail capsules absorbed thrifted partywear; fatigue and backlash appear in comments.",
      ],
      sourceUrls: ["https://example.com/indie-sleaze"],
      retention: "temporary",
      consentToStore: false,
    },
    { llm: { offline: true }, now },
  );
  const culturalMmm = adaptResidueToMeanMedianMode(culturalEngine.result, {
    includeLiteralCompanion: true,
  });
  assert(culturalMmm.interpretive.analysisKind === "interpretive-metaphor", "cultural interpretive kind");
  assert(
    culturalMmm.interpretive.mean.caveats.some((c) => /not a literal/i.test(c)),
    "interpretive mean labeled non-literal",
  );
  assert(culturalMmm.literal?.analysisKind === "literal-statistical", "cultural literal companion");
  assert(
    typeof culturalMmm.literal?.mean.numericValue === "number",
    "literal mean has numericValue",
  );
  assert(culturalMmm.interpretive.counterMode.length >= 1, "cultural counter-mode present");
  assert(toMeanMedianMode(culturalEngine.result).subject.includes("indie"), "toMeanMedianMode subject");

  // Literal vs interpretive must not be blurred
  const pureLiteral = buildLiteralMeanMedianMode({
    subject: "confidence scores",
    values: [0.2, 0.4, 0.4, 0.9],
    signalIds: ["a", "b", "c", "d"],
  });
  assert(pureLiteral.analysisKind === "literal-statistical", "pure literal kind");
  assert(pureLiteral.mean.numericValue !== undefined, "pure literal numeric");
  assert(
    pureLiteral.mean.caveats.some((c) => /literal statistical mean/i.test(c)),
    "literal caveat",
  );
  assert(
    String(pureLiteral.analysisKind) !== String(culturalMmm.interpretive.analysisKind),
    "kinds remain distinct",
  );

  const emotionalMmm = adaptResidueToMeanMedianMode(mindRead.result, {
    includeLiteralCompanion: true,
  });
  assert(emotionalMmm.interpretive.analysisKind === "interpretive-metaphor", "emotional interpretive");
  assert(
    emotionalMmm.interpretive.confidence.summary.includes("not a diagnostic likelihood"),
    "mmm confidence non-diagnostic",
  );
  assert(
    emotionalMmm.interpretive.mode.dominantPattern.length > 0,
    "emotional mode pattern",
  );

  console.log("OK — Residue Phase 2–5 checks passed.");
}

main().catch((err) => {
  console.error("FAIL — Residue verification:", err);
  process.exit(1);
});
