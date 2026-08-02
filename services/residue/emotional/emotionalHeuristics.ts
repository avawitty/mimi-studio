/**
 * Offline Emotional Residue heuristics + research/community separation.
 * Non-diagnostic: multiple neighborhoods, careful framing.
 */

import { EMOTIONAL_PREFERRED_FRAMING } from "../constants";
import { claimConfidenceFromEvidence, layerForSourceType } from "../scoring";
import {
  containsForbiddenEmotionalLanguage,
  flagsForClaim,
  sanitizeEmotionalStatement,
  UNCERTAINTY_FLAGS,
} from "../uncertainty";
import type {
  EvidenceRecord,
  InterpretiveNeighborhood,
  ReportedResponsePattern,
  ResidueClaim,
  SourceReference,
} from "../validation";

export function separateResearchFromCommunityReports(input: {
  sources: SourceReference[];
  evidence: EvidenceRecord[];
}): {
  researchEvidence: EvidenceRecord[];
  communityEvidence: EvidenceRecord[];
  interpretiveEvidence: EvidenceRecord[];
  modelEvidence: EvidenceRecord[];
} {
  const bySource = new Map(input.sources.map((s) => [s.sourceId, s]));
  const researchEvidence: EvidenceRecord[] = [];
  const communityEvidence: EvidenceRecord[] = [];
  const interpretiveEvidence: EvidenceRecord[] = [];
  const modelEvidence: EvidenceRecord[] = [];

  for (const ev of input.evidence) {
    const source = bySource.get(ev.sourceId);
    const layer = ev.evidenceLayer || (source ? layerForSourceType(source.sourceType) : "D");
    if (layer === "A") researchEvidence.push(ev);
    else if (layer === "C") communityEvidence.push(ev);
    else if (layer === "B") interpretiveEvidence.push(ev);
    else modelEvidence.push(ev);
  }
  return { researchEvidence, communityEvidence, interpretiveEvidence, modelEvidence };
}

export function normalizeExperienceOffline(experience: string): string {
  const cleaned = experience.trim().replace(/\s+/g, " ");
  // Strip second-person diagnosis if pasted into the inquiry itself.
  if (containsForbiddenEmotionalLanguage(cleaned)) {
    return "a reported internal experience with overlapping social-comparison and self-evaluation themes";
  }
  return cleaned;
}

export function buildInterpretiveNeighborhoodsOffline(input: {
  experience: string;
  evidence: EvidenceRecord[];
  researchEvidence: EvidenceRecord[];
  communityEvidence: EvidenceRecord[];
}): InterpretiveNeighborhood[] {
  const neighborhoods: InterpretiveNeighborhood[] = [];
  const exp = input.experience.toLowerCase();

  const seed: Array<{
    id: string;
    label: string;
    status: InterpretiveNeighborhood["status"];
    scoreMeaning: InterpretiveNeighborhood["scoreMeaning"];
    match: RegExp;
    base: EvidenceRecord[];
    distinction: string;
  }> = [
    {
      id: "nb_social_comparison",
      label: "Social comparison discomfort",
      status: input.researchEvidence.length ? "research-supported" : "common-description",
      scoreMeaning: input.researchEvidence.length
        ? "evidence-supported-relevance"
        : "semantic-proximity",
      match: /jealous|envy|left behind|comparing|instagram|everyone else/i,
      base: input.researchEvidence.length ? input.researchEvidence : input.evidence,
      distinction: "Describes a comparison pattern, not a clinical label.",
    },
    {
      id: "nb_creative_shame",
      label: "Creative shame / exposure fear",
      status: "common-description",
      scoreMeaning: "semantic-proximity",
      match: /creative|shame|share my work|publish|visible|impost/i,
      base: input.evidence,
      distinction: "About making/showing work — not a diagnosis of social anxiety.",
    },
    {
      id: "nb_attachment_vigilance",
      label: "Relational vigilance",
      status: input.communityEvidence.length ? "community-reported" : "model-proposed",
      scoreMeaning: "pattern-frequency",
      match: /checking|their phone|text|abandon|like me|secretly hates/i,
      base: input.communityEvidence.length ? input.communityEvidence : input.evidence,
      distinction: "Community language for monitoring closeness; not proof of a condition.",
    },
    {
      id: "nb_guilt_of_receiving",
      label: "Guilt when receiving care or liking",
      status: "common-description",
      scoreMeaning: "semantic-proximity",
      match: /guilty when|don't deserve|people like me/i,
      base: input.evidence,
      distinction: "An interpretive neighborhood around receiving positive regard.",
    },
  ];

  for (const row of seed) {
    const matched = row.base.filter((e) => row.match.test(`${e.claimSupported} ${e.excerpt || ""}`));
    const semanticHit = row.match.test(exp);
    if (!semanticHit && matched.length === 0) continue;
    const evid = matched.length ? matched : input.evidence.slice(0, 2);
    const relevance = matched.length
      ? Math.min(0.85, 0.4 + matched.length * 0.12)
      : semanticHit
        ? 0.55
        : 0.3;
    neighborhoods.push({
      neighborhoodId: row.id,
      label: row.label,
      description: sanitizeEmotionalStatement(
        `${EMOTIONAL_PREFERRED_FRAMING.possibleNeighborhood} ${row.label}. ${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} overlapping language around comparison, belonging, or self-evaluation.`,
      ),
      relevanceScore: relevance,
      scoreMeaning: row.scoreMeaning,
      status: evid.length === 0 ? "model-proposed" : row.status,
      evidenceIds: evid.map((e) => e.evidenceId),
      distinctions: [row.distinction, EMOTIONAL_PREFERRED_FRAMING.hypothesisNotConclusion],
      uncertaintyFlags:
        evid.length === 0
          ? [UNCERTAINTY_FLAGS.MODEL_PROPOSED_WITHOUT_EVIDENCE]
          : row.status === "community-reported"
            ? [UNCERTAINTY_FLAGS.COMMUNITY_ONLY]
            : [],
    });
  }

  // Always return at least two neighborhoods to avoid a single-verdict frame.
  if (neighborhoods.length < 2) {
    neighborhoods.push({
      neighborhoodId: "nb_generic_affect",
      label: "Undifferentiated affective strain",
      description: sanitizeEmotionalStatement(
        `${EMOTIONAL_PREFERRED_FRAMING.possibleNeighborhood} undifferentiated affective strain. ${EMOTIONAL_PREFERRED_FRAMING.researchDiffers}`,
      ),
      relevanceScore: 0.4,
      scoreMeaning: "semantic-proximity",
      status: "model-proposed",
      evidenceIds: input.evidence.slice(0, 1).map((e) => e.evidenceId),
      distinctions: [
        "Placeholder neighborhood when the corpus is thin.",
        EMOTIONAL_PREFERRED_FRAMING.hypothesisNotConclusion,
      ],
      uncertaintyFlags: [UNCERTAINTY_FLAGS.MODEL_PROPOSED_WITHOUT_EVIDENCE],
    });
    neighborhoods.push({
      neighborhoodId: "nb_context_stress",
      label: "Situation-linked stress response",
      description: sanitizeEmotionalStatement(
        `${EMOTIONAL_PREFERRED_FRAMING.mayOverlap} situation-linked stress responses described across research and community reports.`,
      ),
      relevanceScore: 0.38,
      scoreMeaning: "semantic-proximity",
      status: input.researchEvidence.length ? "research-supported" : "common-description",
      evidenceIds: (input.researchEvidence.length ? input.researchEvidence : input.evidence)
        .slice(0, 2)
        .map((e) => e.evidenceId),
      distinctions: ["Not a determination about any one person."],
      uncertaintyFlags: [],
    });
  }

  return neighborhoods.slice(0, 6);
}

export function classifyReportedResponsesOffline(input: {
  evidence: EvidenceRecord[];
  researchEvidence: EvidenceRecord[];
  communityEvidence: EvidenceRecord[];
}): {
  adaptive: ReportedResponsePattern[];
  unhelpful: ReportedResponsePattern[];
} {
  const adaptive: ReportedResponsePattern[] = [
    {
      responseId: "resp_adaptive_reflect",
      label: "Reflective journaling / naming the feeling",
      description: sanitizeEmotionalStatement(
        "People describing similar experiences often mention pausing to name the feeling before acting on it.",
      ),
      category: "reflective",
      commonlyReportedOutcomes: ["Slight reduction in rumination intensity", "Clearer self-description"],
      researchSummary: input.researchEvidence.length
        ? "Research-adjacent sources in the corpus discuss reflective labeling as a common coping description."
        : undefined,
      communitySentimentSummary: input.communityEvidence.length
        ? "Community reports sometimes describe naming feelings as helpful, without proving efficacy."
        : undefined,
      evidenceIds: input.evidence.slice(0, 2).map((e) => e.evidenceId),
      evidenceStrength: input.researchEvidence.length ? "moderate" : "weak",
      caveats: ["Not a treatment instruction.", "Outcomes are reported, not guaranteed."],
    },
    {
      responseId: "resp_adaptive_support",
      label: "Support-seeking conversation",
      description: sanitizeEmotionalStatement(
        "One possible response pattern is talking with a trusted person about the experience.",
      ),
      category: "support-seeking",
      commonlyReportedOutcomes: ["Feeling less alone", "Receiving perspective"],
      evidenceIds: input.communityEvidence.slice(0, 2).map((e) => e.evidenceId),
      evidenceStrength: "weak",
      caveats: ["Community-reported pattern only.", "Not clinical advice."],
    },
  ];

  const unhelpful: ReportedResponsePattern[] = [
    {
      responseId: "resp_unhelpful_checking",
      label: "Compulsive checking loops",
      description: sanitizeEmotionalStatement(
        "People describing similar experiences often mention repeated checking (feeds, profiles, messages) that intensifies the loop.",
      ),
      category: "avoidant",
      commonlyReportedOutcomes: ["Short-term relief", "Longer rumination afterward"],
      communitySentimentSummary: input.communityEvidence.length
        ? "Community threads frequently narrate checking as temporarily soothing and later worsening."
        : undefined,
      evidenceIds: input.communityEvidence.slice(0, 2).map((e) => e.evidenceId),
      evidenceStrength: "weak",
      caveats: [
        "Describes a reported pattern — does not prove what any one person should do.",
        "Not a diagnosis.",
      ],
    },
  ];

  return { adaptive, unhelpful };
}

export function mapTypicalClaimBucketsOffline(input: {
  experience: string;
  evidence: EvidenceRecord[];
  researchEvidence: EvidenceRecord[];
  communityEvidence: EvidenceRecord[];
}): {
  neighboringFeelings: ResidueClaim[];
  commonTriggers: ResidueClaim[];
  commonInterpretations: ResidueClaim[];
  alternativeInterpretations: ResidueClaim[];
  bodilySensations: ResidueClaim[];
  commonBehaviors: ResidueClaim[];
  internetExpressions: ResidueClaim[];
  historicalExpressions: ResidueClaim[];
  therapeuticModels: ResidueClaim[];
  communityPatterns: ResidueClaim[];
  cognitivePatterns: ResidueClaim[];
} {
  const mk = (
    id: string,
    statement: string,
    status: ResidueClaim["status"],
    evid: EvidenceRecord[],
  ): ResidueClaim => {
    const safe = sanitizeEmotionalStatement(statement);
    const use = evid.slice(0, 3);
    const finalStatus = use.length === 0 ? "model-proposed" : status;
    return {
      claimId: id,
      statement: safe,
      status: finalStatus,
      evidenceIds: use.map((e) => e.evidenceId),
      counterEvidenceIds: [],
      confidence: claimConfidenceFromEvidence(use, finalStatus),
      uncertaintyFlags: flagsForClaim({ status: finalStatus, evidence: use }),
      evidenceLayers: [...new Set(use.map((e) => e.evidenceLayer))],
    };
  };

  return {
    neighboringFeelings: [
      mk(
        "claim_neighbor_envy",
        `${EMOTIONAL_PREFERRED_FRAMING.mayOverlap} envy, FOMO, or embarrassment in neighboring reports.`,
        "interpretive",
        input.evidence,
      ),
    ],
    commonTriggers: [
      mk(
        "claim_trigger_feed",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} social feeds, status updates, or creative visibility moments as triggers.`,
        "reported",
        input.communityEvidence.length ? input.communityEvidence : input.evidence,
      ),
    ],
    commonInterpretations: [
      mk(
        "claim_interp_compare",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} interpreting the feeling as falling behind others.`,
        "reported",
        input.evidence,
      ),
    ],
    alternativeInterpretations: [
      mk(
        "claim_alt_values",
        `${EMOTIONAL_PREFERRED_FRAMING.possibleNeighborhood} a values-conflict reading (wanting recognition while fearing exposure).`,
        "model-proposed",
        [],
      ),
    ],
    bodilySensations: [
      mk(
        "claim_body",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} chest tightness, restlessness, or stomach drop — reported sensations, not medical findings.`,
        "reported",
        input.communityEvidence,
      ),
    ],
    commonBehaviors: [
      mk(
        "claim_behavior_check",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} checking, drafting unsent messages, or withdrawing from sharing.`,
        "reported",
        input.communityEvidence.length ? input.communityEvidence : input.evidence,
      ),
    ],
    internetExpressions: [
      mk(
        "claim_internet",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} meme language, vent posts, and quote-posts as internet expressions of the experience.`,
        "reported",
        input.communityEvidence,
      ),
    ],
    historicalExpressions: [
      mk(
        "claim_historical",
        "Historical and literary traditions have used neighboring vocabularies (envy, shame, melancholy) without mapping 1:1 onto modern internet reports.",
        "historical",
        input.evidence.filter((e) => e.evidenceLayer === "B"),
      ),
    ],
    therapeuticModels: [
      mk(
        "claim_therapy_frame",
        "Therapeutic frameworks sometimes discuss related themes (social comparison, shame resilience) as models for reflection — not as a diagnosis of the user.",
        input.researchEvidence.length ? "interpretive" : "model-proposed",
        input.researchEvidence,
      ),
    ],
    communityPatterns: [
      mk(
        "claim_community",
        `${EMOTIONAL_PREFERRED_FRAMING.researchDiffers} Community threads emphasize narrative solidarity more than validated mechanisms.`,
        "reported",
        input.communityEvidence,
      ),
    ],
    cognitivePatterns: [
      mk(
        "claim_cognitive",
        `${EMOTIONAL_PREFERRED_FRAMING.peopleOftenMention} mind-reading (“they secretly hate me”) and fortune-telling loops as cognitive patterns in reports.`,
        "reported",
        input.evidence,
      ),
    ],
  };
}
