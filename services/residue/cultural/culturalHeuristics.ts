/**
 * Offline cultural lineage / codes / absorption detectors.
 */

import { flagsForClaim } from "../uncertainty";
import { claimConfidenceFromEvidence } from "../scoring";
import type {
  CulturalCode,
  CulturalLineageStage,
  EvidenceRecord,
  ResidueAssociation,
  ResidueClaim,
} from "../validation";

const STAGE_KEYWORDS: Array<{ stage: CulturalLineageStage["stage"]; words: string[] }> = [
  { stage: "prehistory", words: ["origin", "before", "proto", "roots", "earlier"] },
  { stage: "emergence", words: ["emerged", "coined", "first appeared", "began", "nascent"] },
  { stage: "amplification", words: ["tiktok", "viral", "spread", "amplified", "mainstreamed"] },
  { stage: "commercialization", words: ["retail", "zara", "shein", "commercial", "lookbook", "brand"] },
  { stage: "fatigue", words: ["overdone", "fatigue", "tired of", "played out", "saturated"] },
  { stage: "counter-signal", words: ["backlash", "anti-", "rejects", "counter", "against"] },
  { stage: "revival", words: ["revival", "return of", "y2k again", "comes back"] },
  { stage: "absorption", words: ["absorbed", "default", "algorithm", "platformized"] },
];

export function buildCulturalLineageOffline(input: {
  query: string;
  evidence: EvidenceRecord[];
}): CulturalLineageStage[] {
  const stages: CulturalLineageStage[] = [];
  for (const [index, def] of STAGE_KEYWORDS.entries()) {
    const matched = input.evidence.filter((e) =>
      def.words.some((w) => `${e.claimSupported} ${e.excerpt || ""}`.toLowerCase().includes(w)),
    );
    if (matched.length === 0) continue;
    const confidence = claimConfidenceFromEvidence(matched, "historical");
    stages.push({
      stageId: `lineage_${def.stage}_${index}`,
      label: titleCase(def.stage),
      stage: def.stage,
      description: `${titleCase(def.stage)} signals for "${input.query}" appear in ${matched.length} evidence record(s).`,
      evidenceIds: matched.map((e) => e.evidenceId),
      confidence,
    });
  }

  if (stages.length === 0 && input.evidence.length > 0) {
    stages.push({
      stageId: "lineage_emergence_fallback",
      label: "Emergence (thinly evidenced)",
      stage: "emergence",
      description: `Insufficient staged chronology in sources; treating current corpus as an emergence window for "${input.query}".`,
      evidenceIds: input.evidence.slice(0, 3).map((e) => e.evidenceId),
      confidence: 0.35,
    });
  }
  return stages;
}

export function detectCulturalCodesOffline(input: {
  query: string;
  evidence: EvidenceRecord[];
}): CulturalCode[] {
  const codeHints: Array<{ category: CulturalCode["category"]; words: string[] }> = [
    { category: "visual", words: ["silhouette", "skirt", "heel", "glasses", "palette", "outfit"] },
    { category: "linguistic", words: ["called", "named", "phrase", "caption", "slang"] },
    { category: "behavioral", words: ["poses", "at work", "commute", "ritual"] },
    { category: "commercial", words: ["buy", "retail", "drop", "sku", "brand"] },
    { category: "infrastructural", words: ["tiktok", "algorithm", "fyp", "instagram", "pinterest"] },
  ];
  const codes: CulturalCode[] = [];
  for (const hint of codeHints) {
    const matched = input.evidence.filter((e) =>
      hint.words.some((w) => `${e.claimSupported} ${e.excerpt || ""}`.toLowerCase().includes(w)),
    );
    if (matched.length === 0) continue;
    codes.push({
      codeId: `code_${hint.category}`,
      category: hint.category,
      label: `${titleCase(hint.category)} codes around ${input.query}`,
      description: `Recurring ${hint.category} signals co-occur with discourse about "${input.query}".`,
      evidenceIds: matched.map((e) => e.evidenceId),
      confidence: claimConfidenceFromEvidence(matched, "interpretive"),
    });
  }
  return codes;
}

export function detectCommercialAbsorptionOffline(evidence: EvidenceRecord[]): ResidueClaim[] {
  const matched = evidence.filter((e) =>
    /retail|brand|commercial|lookbook|zara|shein|ads?|merch/i.test(`${e.claimSupported} ${e.excerpt || ""}`),
  );
  if (matched.length === 0) return [];
  return [
    makeClaim({
      claimId: "claim_commercial_absorption",
      statement: "Commercial channels appear to absorb or restage the aesthetic for retail circulation.",
      status: "interpretive",
      evidence: matched,
    }),
  ];
}

export function detectComputationalResidueOffline(evidence: EvidenceRecord[]): ResidueClaim[] {
  const matched = evidence.filter((e) =>
    /algorithm|fyp|tiktok|for you|recommendation|ai[- ]generated|filter/i.test(
      `${e.claimSupported} ${e.excerpt || ""}`,
    ),
  );
  if (matched.length === 0) {
    return [
      makeClaim({
        claimId: "claim_computational_model",
        statement:
          "Platform recommendation dynamics may have reshaped visibility of this aesthetic (model-proposed; not directly evidenced in corpus).",
        status: "model-proposed",
        evidence: [],
      }),
    ];
  }
  return [
    makeClaim({
      claimId: "claim_computational_observed",
      statement: "Computational distribution surfaces (feeds/algorithms) are referenced as part of circulation.",
      status: "reported",
      evidence: matched,
    }),
  ];
}

export function detectLostAndSurvivingMeaningOffline(input: {
  query: string;
  evidence: EvidenceRecord[];
}): { surviving: ResidueClaim[]; lost: ResidueClaim[] } {
  const fatigue = input.evidence.filter((e) =>
    /fatigue|overdone|played out|lost|diluted|original meaning/i.test(
      `${e.claimSupported} ${e.excerpt || ""}`,
    ),
  );
  const surviving = [
    makeClaim({
      claimId: "claim_surviving",
      statement: `Surviving meaning: "${input.query}" still functions as a recognizable stylistic or social shorthand in the available corpus.`,
      status: input.evidence.length ? "interpretive" : "model-proposed",
      evidence: input.evidence.slice(0, 3),
    }),
  ];
  const lost =
    fatigue.length > 0
      ? [
          makeClaim({
            claimId: "claim_lost",
            statement:
              "Some earlier niche or ironic charge may be diluting as the look saturates broader channels.",
            status: "interpretive",
            evidence: fatigue,
          }),
        ]
      : [
          makeClaim({
            claimId: "claim_lost_model",
            statement:
              "Possible lost meanings (insider irony, subcultural refusal) are not well documented in this corpus (model-proposed).",
            status: "model-proposed",
            evidence: [],
          }),
        ];
  return { surviving, lost };
}

export function generateAssociationsOffline(input: {
  query: string;
  evidence: EvidenceRecord[];
}): ResidueAssociation[] {
  const associations: ResidueAssociation[] = [];
  if (input.evidence.length >= 2) {
    associations.push({
      associationId: "assoc_cooccur_1",
      originNodeId: input.query,
      targetNodeId: "platform-circulation",
      relationship: "co-occurs-with",
      description: "Mentions co-occur with platform circulation language in the corpus.",
      evidenceIds: input.evidence.slice(0, 2).map((e) => e.evidenceId),
      confidence: 0.45,
      status: "interpretive",
    });
  }
  associations.push({
    associationId: "assoc_model_antecedent",
    originNodeId: input.query,
    targetNodeId: "earlier-secretary-chic-media",
    relationship: "descends-from",
    description:
      "Possible descent from earlier secretary-chic / corporate-sexy media tropes (model-proposed unless evidenced).",
    evidenceIds: [],
    confidence: 0.2,
    status: "model-proposed",
  });
  return associations;
}

export function findCounterSignalsOffline(evidence: EvidenceRecord[]): ResidueClaim[] {
  const matched = evidence.filter((e) =>
    /backlash|anti-|fatigue|reject|over it|cringe|counter/i.test(
      `${e.claimSupported} ${e.excerpt || ""}`,
    ),
  );
  if (matched.length === 0) {
    return [
      makeClaim({
        claimId: "claim_counter_gap",
        statement: "No clear countersignal language was found in the current corpus.",
        status: "model-proposed",
        evidence: [],
      }),
    ];
  }
  return [
    makeClaim({
      claimId: "claim_counter_observed",
      statement: "Countersignal or fatigue language appears in the corpus.",
      status: "reported",
      evidence: matched,
    }),
  ];
}

function makeClaim(input: {
  claimId: string;
  statement: string;
  status: ResidueClaim["status"];
  evidence: EvidenceRecord[];
}): ResidueClaim {
  const confidence = claimConfidenceFromEvidence(input.evidence, input.status);
  const uncertaintyFlags = flagsForClaim({
    status: input.status,
    evidence: input.evidence,
  });
  return {
    claimId: input.claimId,
    statement: input.statement,
    status: input.status,
    evidenceIds: input.evidence.map((e) => e.evidenceId),
    counterEvidenceIds: [],
    confidence,
    uncertaintyFlags,
    evidenceLayers: [...new Set(input.evidence.map((e) => e.evidenceLayer))],
  };
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
