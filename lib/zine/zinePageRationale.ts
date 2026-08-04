import type {
  MimiZineArtifact,
  ZinePageSpec,
  ZineSectionType,
  ZineNarrativeFunction,
} from "../../types";
import { planPageById } from "./applyZineIssuePlan";

export interface ZinePageRationale {
  sectionType: ZineSectionType;
  narrativeFunction: ZineNarrativeFunction;
  label: string;
  whyExists: string;
  sequenceNote: string;
  derived: boolean;
}

const SECTION_LABELS: Record<ZineSectionType, string> = {
  cover: "Cover",
  opening: "Threshold",
  reading: "The Reading",
  "signal-index": "Signal Index",
  "visual-plate": "Visual Plate",
  evidence: "Evidence",
  essay: "Editorial Essay",
  interlude: "Interlude",
  roadmap: "Application",
  debris: "Debris",
  colophon: "Colophon",
};

function narrativeFunctionForSection(
  sectionType: ZineSectionType,
  derived: boolean,
): ZineNarrativeFunction {
  switch (sectionType) {
    case "cover":
      return derived ? "invitation" : "orientation";
    case "opening":
      return "orientation";
    case "reading":
      return "revelation";
    case "signal-index":
    case "evidence":
      return "evidence";
    case "visual-plate":
      return "intensification";
    case "essay":
      return "complication";
    case "interlude":
      return "release";
    case "roadmap":
      return "application";
    case "debris":
      return "residue";
    case "colophon":
      return "residue";
    default: {
      const exhaustive: never = sectionType;
      return exhaustive;
    }
  }
}

function whyExistsCopy(
  sectionType: ZineSectionType,
  artifact: MimiZineArtifact,
  derived: boolean,
): string {
  switch (sectionType) {
    case "cover":
      return derived
        ? "Establishes the issue threshold and title before any authored plate."
        : "Anchors the issue identity and cover treatment.";
    case "opening":
      return "Orients the reader to scope, intent, and editorial purpose.";
    case "reading":
      return artifact.reading.centralObservation.trim()
        ? "Carries the approved central observation and interpretive turn."
        : "Reserved for the issue reading once observation is approved.";
    case "signal-index":
      return artifact.reading.signals.length > 0
        ? "Indexes inspectable signals tied to source material."
        : "Indexes motifs when the reading produces durable signals.";
    case "visual-plate":
      return "Adds visual information that develops the issue rather than decorating it.";
    case "evidence":
      return "Makes support inspectable through sources, examples, or observation.";
    case "essay":
      return "Introduces editorial complication, contrast, or sustained argument.";
    case "interlude":
      return "Creates necessary pause so the sequence can breathe.";
    case "roadmap":
      return "Translates the reading into application, direction, or next movement.";
    case "debris":
      return "Preserves unresolved originating material without promoting it to evidence.";
    case "colophon":
      return derived
        ? "Closes the issue with provenance, authorship, and public source custody."
        : "Records provenance and publication custody for this revision.";
    default: {
      const exhaustive: never = sectionType;
      return exhaustive;
    }
  }
}

function sequenceNoteCopy(
  sectionType: ZineSectionType,
  pageNumber: number,
  totalPages: number,
): string {
  if (pageNumber <= 1) {
    return "Opens the issue sequence.";
  }
  if (pageNumber >= totalPages) {
    return "Closes the proof sequence before publication projection.";
  }

  switch (sectionType) {
    case "reading":
      return "Arrives after threshold material and before evidence or plates deepen the argument.";
    case "visual-plate":
      return "Follows interpretive setup so image work develops rather than replaces the reading.";
    case "evidence":
    case "signal-index":
      return "Supports claims before the issue treats them as settled conclusions.";
    case "roadmap":
      return "Appears after development beats so application follows supported interpretation.";
    case "debris":
      return "Holds residue after the main editorial movement without forcing closure.";
    case "colophon":
      return "Final page in the canonical sequence.";
    default:
      return `Page ${pageNumber} of ${totalPages} in the section-ordered proof.`;
  }
}

export function isDerivedProofPage(
  page: ZinePageSpec,
  artifact?: MimiZineArtifact,
): boolean {
  if (page.id?.includes(":derived:")) return true;
  const planned = artifact ? planPageById(artifact.issuePlan, page.id) : undefined;
  return planned?.derived ?? false;
}

export function describeZinePageRationale(
  page: ZinePageSpec,
  artifact: MimiZineArtifact,
  options?: {
    derived?: boolean;
    pageNumber?: number;
    totalPages?: number;
  },
): ZinePageRationale {
  const derived = options?.derived ?? isDerivedProofPage(page, artifact);
  const plannedPage = planPageById(artifact.issuePlan, page.id);
  const sectionType =
    plannedPage?.sectionType || page.sectionType || "visual-plate";
  const narrativeFunction =
    plannedPage?.narrativeFunction ||
    narrativeFunctionForSection(sectionType, derived);
  const pageNumber = options?.pageNumber ?? page.pageNumber;
  const totalPages =
    options?.totalPages ??
    artifact.issuePlan?.pages.length ??
    artifact.issueStructure.totalPages;

  return {
    sectionType,
    narrativeFunction,
    label: SECTION_LABELS[sectionType],
    whyExists: plannedPage?.earnsExistenceBy[0]?.rationale || whyExistsCopy(
      sectionType,
      artifact,
      derived,
    ),
    sequenceNote:
      plannedPage?.transitionFromPrevious ||
      plannedPage?.purpose ||
      sequenceNoteCopy(sectionType, pageNumber, totalPages),
    derived: plannedPage?.derived ?? derived,
  };
}

export type { ZineNarrativeFunction };

export function sectionAbbreviation(sectionType: ZineSectionType): string {
  switch (sectionType) {
    case "cover":
      return "COV";
    case "opening":
      return "THR";
    case "reading":
      return "RDG";
    case "signal-index":
      return "SIG";
    case "visual-plate":
      return "PLT";
    case "evidence":
      return "EVD";
    case "essay":
      return "ESS";
    case "interlude":
      return "INT";
    case "roadmap":
      return "APP";
    case "debris":
      return "DEB";
    case "colophon":
      return "COL";
    default: {
      const exhaustive: never = sectionType;
      return exhaustive;
    }
  }
}
