import type { UsedContextSnapshot } from "../types";

export const INTEL_HUB_HANDOFF_KEY = "mimi_intel_hub_press_handoff";
export const INTEL_HUB_HANDOFF_CHANGED = "mimi:intel-hub-press-handoff-changed";
export const INTEL_PROJECT_RUN_KEY = "mimi_intel_project_run";
export const INTEL_PROJECT_RUN_CHANGED = "mimi:intel-project-run-changed";

export type IntelEvidenceKind = "evidence" | "inference";

export interface IntelStrategyLike {
  clientName: string;
  tagline: string;
  wedgeFocus: number;
  editorialOrthodoxy: number;
  dataSovereignty: boolean;
  thesis: {
    chapter: string;
    title: string;
    summary1: string;
    summary2: string;
    bullets: string[];
  };
  wedge: {
    title: string;
    summary: string;
  };
}

export interface IntelEvidenceItem {
  id: string;
  kind: IntelEvidenceKind;
  title: string;
  content: string;
  source: string;
  confidence: number;
  tags: string[];
}

export interface IntelCatalogCandidate {
  id: string;
  title: string;
  vendor?: string;
  price?: string;
  imageUrl?: string;
  url?: string;
  raw: unknown;
}

export interface IntelHubPressHandoff {
  version: 1;
  id: string;
  clientName: string;
  sourceUrl?: string;
  thesis: string;
  approvedContext: UsedContextSnapshot[];
  commerceQuery: string;
  selectedCandidate?: IntelCatalogCandidate;
  compiledAt: number;
  status: "review_required";
}

export type IntelProjectStage =
  | "intake"
  | "review"
  | "used-context"
  | "discovery"
  | "artifact-pack"
  | "press-review"
  | "shopify-draft";

export interface IntelProjectRun {
  version: 1;
  id: string;
  projectId: string;
  projectName: string;
  stage: IntelProjectStage;
  sourceUrl?: string;
  evidenceCount: number;
  selectedReviewCount: number;
  approvedContextCount: number;
  reusableRuleCount: number;
  commerceQuery?: string;
  catalogCandidateCount: number;
  selectedCandidateId?: string;
  artifactPackId?: string;
  pressStatus: "not_started" | "review_required" | "approved" | "draft_created";
  createdAt: number;
  updatedAt: number;
}

export function createIntelProjectRun(
  projectName: string,
  evidenceCount = 0,
  now = Date.now(),
): IntelProjectRun {
  const projectId = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";

  return {
    version: 1,
    id: `intel-run-${now}`,
    projectId: `intel-${projectId}`,
    projectName,
    stage: evidenceCount > 0 ? "review" : "intake",
    evidenceCount,
    selectedReviewCount: 0,
    approvedContextCount: 0,
    reusableRuleCount: 0,
    catalogCandidateCount: 0,
    pressStatus: "not_started",
    createdAt: now,
    updatedAt: now,
  };
}

export function createIntelProjectRunFromHandoff(
  handoff: IntelHubPressHandoff,
): IntelProjectRun {
  return updateIntelProjectRun(
    createIntelProjectRun(
      handoff.clientName,
      handoff.approvedContext.length,
      handoff.compiledAt,
    ),
    {
      sourceUrl: handoff.sourceUrl,
      selectedReviewCount: handoff.approvedContext.length,
      approvedContextCount: handoff.approvedContext.length,
      commerceQuery: handoff.commerceQuery,
      catalogCandidateCount: handoff.selectedCandidate ? 1 : 0,
      selectedCandidateId: handoff.selectedCandidate?.id,
      artifactPackId: handoff.id,
      pressStatus: "review_required",
    },
    handoff.compiledAt,
  );
}

export function deriveIntelProjectStage(
  run: Pick<
    IntelProjectRun,
    | "evidenceCount"
    | "approvedContextCount"
    | "catalogCandidateCount"
    | "artifactPackId"
    | "pressStatus"
  >,
): IntelProjectStage {
  if (run.pressStatus === "draft_created") return "shopify-draft";
  if (run.pressStatus === "review_required" && run.artifactPackId) return "press-review";
  if (run.artifactPackId) return "artifact-pack";
  if (run.catalogCandidateCount > 0) return "discovery";
  if (run.approvedContextCount > 0) return "used-context";
  if (run.evidenceCount > 0) return "review";
  return "intake";
}

export function updateIntelProjectRun(
  current: IntelProjectRun,
  patch: Partial<Omit<IntelProjectRun, "version" | "id" | "createdAt">>,
  now = Date.now(),
): IntelProjectRun {
  const next = {
    ...current,
    ...patch,
    updatedAt: now,
  };
  return {
    ...next,
    stage: patch.stage || deriveIntelProjectStage(next),
  };
}

export function writeIntelProjectRun(run: IntelProjectRun): void {
  localStorage.setItem(INTEL_PROJECT_RUN_KEY, JSON.stringify(run));
  window.dispatchEvent(new CustomEvent(INTEL_PROJECT_RUN_CHANGED));
}

export function readIntelProjectRun(): IntelProjectRun | null {
  try {
    const raw = localStorage.getItem(INTEL_PROJECT_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntelProjectRun;
    if (parsed.version !== 1 || !parsed.id || !parsed.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

const stableId = (prefix: string, value: string, index: number): string =>
  `${prefix}-${index}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "signal"}`;

export function buildIntelEvidence(
  strategy: IntelStrategyLike,
  sourceUrl?: string,
): IntelEvidenceItem[] {
  const evidenceSource = sourceUrl || "Mimi strategic baseline";
  const observed = [
    strategy.tagline,
    ...strategy.thesis.bullets,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);

  const evidence = observed.map((content, index) => ({
    id: stableId("evidence", content, index),
    kind: "evidence" as const,
    title: index === 0 ? "Positioning statement" : `Observed signal ${index}`,
    content,
    source: evidenceSource,
    confidence: sourceUrl ? 0.9 : 0.7,
    tags: ["intel-hub", "evidence", strategy.clientName],
  }));

  const inferences: IntelEvidenceItem[] = [
    {
      id: stableId("inference", strategy.thesis.title, 0),
      kind: "inference",
      title: strategy.thesis.title,
      content: strategy.thesis.summary1,
      source: "Tailor interpretation",
      confidence: Math.max(0.5, Math.min(0.95, strategy.wedgeFocus / 100)),
      tags: ["intel-hub", "tailor-inference", strategy.clientName],
    },
    {
      id: stableId("inference", strategy.wedge.title, 1),
      kind: "inference",
      title: strategy.wedge.title,
      content: strategy.wedge.summary,
      source: "Tailor interpretation",
      confidence: Math.max(0.5, Math.min(0.9, strategy.editorialOrthodoxy / 100)),
      tags: ["intel-hub", "tailor-inference", "wedge", strategy.clientName],
    },
  ];

  return [...evidence, ...inferences].filter((item) => item.content.trim());
}

export function buildCommerceQuery(
  strategy: IntelStrategyLike,
  approvedContext: Array<Pick<UsedContextSnapshot, "title" | "content">>,
): string {
  const terms = [
    strategy.clientName,
    strategy.thesis.title,
    ...approvedContext.flatMap((item) => [item.title, item.content]),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  return Array.from(new Set(terms)).slice(0, 10).join(" ");
}

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const nestedString = (value: unknown, paths: string[][]): string | undefined => {
  for (const path of paths) {
    let cursor: unknown = value;
    for (const key of path) {
      if (!cursor || typeof cursor !== "object") {
        cursor = undefined;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[key];
    }
    const found = stringValue(cursor);
    if (found) return found;
  }
  return undefined;
};

export function normalizeIntelCatalogCandidate(
  product: unknown,
  index: number,
): IntelCatalogCandidate {
  const title =
    nestedString(product, [["title"], ["name"], ["product", "title"]]) ||
    `Catalog candidate ${index + 1}`;
  const id =
    nestedString(product, [["id"], ["product_id"], ["product", "id"]]) ||
    stableId("candidate", title, index);
  const vendor = nestedString(product, [["vendor"], ["brand"], ["product", "vendor"]]);
  const imageUrl = nestedString(product, [
    ["image", "url"],
    ["image_url"],
    ["featuredImage", "url"],
    ["product", "image", "url"],
  ]);
  const url = nestedString(product, [["url"], ["onlineStoreUrl"], ["product", "url"]]);
  const price = nestedString(product, [
    ["price"],
    ["priceRange", "minVariantPrice", "amount"],
    ["product", "price"],
  ]);

  return { id, title, vendor, price, imageUrl, url, raw: product };
}

export function writeIntelHubPressHandoff(handoff: IntelHubPressHandoff): void {
  localStorage.setItem(INTEL_HUB_HANDOFF_KEY, JSON.stringify(handoff));
  window.dispatchEvent(new CustomEvent(INTEL_HUB_HANDOFF_CHANGED));
}

export function readIntelHubPressHandoff(): IntelHubPressHandoff | null {
  try {
    const raw = localStorage.getItem(INTEL_HUB_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntelHubPressHandoff;
    if (parsed.version !== 1 || !parsed.id || !parsed.clientName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearIntelHubPressHandoff(): void {
  localStorage.removeItem(INTEL_HUB_HANDOFF_KEY);
  window.dispatchEvent(new CustomEvent(INTEL_HUB_HANDOFF_CHANGED));
}
