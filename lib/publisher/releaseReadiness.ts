import type { ZineMetadata } from "../../types";
import {
  buildExportManifest,
  validateExportManifest,
  type ExportDiagnostic,
} from "../../services/exportManifestService";
import { getEditorialCompileExport } from "../../lib/editCompileExport";
import {
  readIntelHubPressHandoff,
  type IntelHubPressHandoff,
} from "../../lib/intelHubWorkflow";
import { normalizeZineArtifact } from "../zine/normalizeZineArtifact";
import {
  buildZineProofDiagnostics,
  summarizeZineProof,
  type ZineProofDiagnostic,
} from "../zine/zineProofDiagnostics";
import { buildZineProofSequence } from "../zine/zineIssuePlanner";
import { hydrateLegacyZineMetadata } from "../zine/zineMigrations";
import type { ShopifyConnectionStatus, ShopifyPackInspection } from "../../services/shopifyExportService";
import type {
  ApprovalItem,
  ArtifactReleaseReadiness,
  ReadinessStatus,
  ReleaseCheck,
  ReleaseDestination,
  ReleaseHistoryEntry,
  ReleaseRecommendation,
  ReleaseStage,
  ReleaseStageId,
} from "./types";

export interface ReleaseReadinessContext {
  shopifyConnection?: ShopifyConnectionStatus | null;
  shopifyInspection?: ShopifyPackInspection | null;
  intelHandoff?: IntelHubPressHandoff | null;
}

function statusFromPass(pass: boolean, optional = false): ReadinessStatus {
  if (pass) return "ready";
  return optional ? "needs-review" : "blocked";
}

function worstStatus(statuses: ReadinessStatus[]): ReadinessStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("needs-review")) return "needs-review";
  if (statuses.every((s) => s === "not-configured")) return "not-configured";
  if (statuses.includes("ready")) return "ready";
  return "needs-review";
}

function countUnresolved(checks: ReleaseCheck[]): number {
  return checks.filter((c) => c.status !== "ready").length;
}

function proofToChecks(diagnostics: ZineProofDiagnostic[]): ReleaseCheck[] {
  return diagnostics.map((d) => ({
    id: `proof-${d.id}${d.pageId ? `-${d.pageId}` : ""}`,
    label: d.message,
    status:
      d.severity === "blocking"
        ? "blocked"
        : d.severity === "warning"
          ? "needs-review"
          : "ready",
    summary: d.correction,
    evidence: [d.message],
    actionLabel: "Review proof",
    actionPath: "/studio",
  }));
}

function exportDiagToCheck(d: ExportDiagnostic): ReleaseCheck {
  const optional = d.id === "used-context" || d.id === "cover-image" || d.id === "editorial-compile";
  return {
    id: `meta-${d.id}`,
    label: d.label,
    status: statusFromPass(d.pass, optional),
    summary: d.message || d.label,
    evidence: [d.message || d.label],
  };
}

function pagesMissingAltText(metadata: ZineMetadata): { pageNumber: number; headline?: string }[] {
  const pages = metadata.content?.pages || [];
  return pages.filter((page) => {
    const hasImage =
      page.image_url ||
      page.customLayout?.elements?.some((el) => el.type === "image" && el.content);
    return hasImage && !page.altText?.trim();
  }).map((page) => ({ pageNumber: page.pageNumber, headline: page.headline }));
}

function buildRightsChecks(
  proofDiagnostics: ZineProofDiagnostic[],
  metadata: ZineMetadata,
): ReleaseCheck[] {
  const checks: ReleaseCheck[] = [];
  const rightsIds = [
    "absent-provenance",
    "private-context-exposure",
    "unapproved-direction",
  ];
  proofDiagnostics
    .filter((d) => rightsIds.includes(d.id))
    .forEach((d) => {
      checks.push({
        id: `rights-${d.id}`,
        label: d.message,
        status: d.severity === "blocking" ? "blocked" : "needs-review",
        summary: d.correction,
        evidence: [d.message],
        actionLabel: "Review rights",
        actionPath: "/studio",
      });
    });

  const fragments = metadata.fragmentsUsed || [];
  const snapshots = metadata.usedContextSnapshots || [];
  if (fragments.length > 0) {
    const missingAttribution = fragments.filter(
      (id) => !snapshots.some((s) => s.atomId === id),
    );
    if (missingAttribution.length > 0) {
      checks.push({
        id: "rights-missing-attribution",
        label: `${missingAttribution.length} fragment(s) lack source attribution`,
        status: "needs-review",
        summary: "Attach Used Context snapshots for referenced fragments.",
        evidence: missingAttribution.map((id) => `Fragment ${id}`),
        actionLabel: "Review context",
        actionPath: "/scribe",
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      id: "rights-clear",
      label: "Rights and disclosure",
      status: "ready",
      summary: "No blocking rights or disclosure issues detected.",
    });
  }
  return checks;
}

function buildContextChecks(
  metadata: ZineMetadata,
  editorialAttached: boolean,
): ReleaseCheck[] {
  const checks: ReleaseCheck[] = [];
  const fragmentCount = metadata.fragmentsUsed?.length ?? 0;
  const snapshotCount = metadata.usedContextSnapshots?.length ?? 0;

  checks.push({
    id: "context-fragments",
    label: "Used Context fragments",
    status: fragmentCount > 0 ? "ready" : "needs-review",
    summary:
      fragmentCount > 0
        ? `${fragmentCount} fragment(s) referenced · ${snapshotCount} snapshot(s)`
        : "No fragments attached — optional for standalone issues.",
    evidence:
      fragmentCount > 0
        ? metadata.fragmentsUsed!.map((id) => `Fragment ${id}`)
        : undefined,
  });

  checks.push({
    id: "context-editorial-compile",
    label: "Editorial compile from The Edit",
    status: editorialAttached ? "ready" : "needs-review",
    summary: editorialAttached
      ? "Editorial compile attached for export."
      : "No editorial compile — optional unless Press export needs markdown.",
    actionLabel: editorialAttached ? undefined : "Open The Edit",
    actionPath: editorialAttached ? undefined : "/the-edit",
  });

  return checks;
}

function buildDestinations(
  metadata: ZineMetadata,
  proofSummary: ReturnType<typeof summarizeZineProof>,
  manifestValid: boolean,
  missingAlt: { pageNumber: number }[],
  ctx: ReleaseReadinessContext,
): ReleaseDestination[] {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const pages = hydrated.content?.pages || [];
  const imagePages = pages.filter(
    (p) =>
      p.image_url ||
      p.customLayout?.elements?.some((el) => el.type === "image" && el.content),
  );
  const isPublic = metadata.isPublic || metadata.publication?.visibility === "public";
  const handle = metadata.userHandle || "creator";
  const shareUrl = `https://mimi.fish/s/${metadata.id}`;
  const canonicalUrl = metadata.publication?.canonicalUrl || `https://mimi.you/zine/${metadata.id}`;

  const webBlocking: string[] = [];
  if (!manifestValid) webBlocking.push("meta-title");
  if (proofSummary.blocking > 0) webBlocking.push("proof-blocking");

  const webIssue: ReleaseDestination = {
    id: "web-issue",
    label: "Mimi web issue",
    status: isPublic
      ? "ready"
      : proofSummary.blocking > 0
        ? "blocked"
        : manifestValid
          ? "needs-review"
          : "blocked",
    description: isPublic
      ? "Issue is public and reachable via share routes."
      : "Private issue — publish will make it reachable at share URL after consent.",
    previewAvailable: true,
    publishAvailable: proofSummary.blocking === 0 && manifestValid,
    blockingCheckIds: webBlocking,
    detailLines: [
      isPublic ? "Public" : "Private",
      `Share: ${shareUrl}`,
      `Canonical: ${canonicalUrl}`,
    ],
  };

  const pdfBlocking = proofSummary.blocking > 0 ? ["proof-blocking"] : [];
  const archivalPdf: ReleaseDestination = {
    id: "archival-pdf",
    label: "Archival PDF",
    status:
      proofSummary.blocking > 0
        ? "blocked"
        : pages.length > 0
          ? "ready"
          : "blocked",
    description: `${pages.length} page(s) · structured PDF export from artifact metadata.`,
    previewAvailable: false,
    publishAvailable: proofSummary.blocking === 0 && pages.length > 0,
    blockingCheckIds: pdfBlocking,
    detailLines: [`${pages.length} pages`, `Proof: ${proofSummary.blocking === 0 ? "valid" : "blocked"}`],
  };

  const assetPackage: ReleaseDestination = {
    id: "asset-package",
    label: "Asset package",
    status: imagePages.length > 0 ? "ready" : "needs-review",
    description: `ZIP of ${imagePages.length} visual plate(s) from this issue.`,
    previewAvailable: false,
    publishAvailable: imagePages.length > 0,
    blockingCheckIds: [],
    detailLines: [`${imagePages.length} image plate(s)`],
  };

  const shopifyConnected = ctx.shopifyConnection?.configured === true;
  const inspection = ctx.shopifyInspection;
  let shopifyStatus: ReadinessStatus = "not-configured";
  let shopifyDesc = "Connect Shopify in deployment environment to create draft products.";
  const shopifyBlocking: string[] = [];
  const shopifyDetails: string[] = [];

  if (!shopifyConnected) {
    shopifyStatus = "not-configured";
    shopifyDesc = "Server Shopify credentials not configured.";
    shopifyDetails.push("Not connected");
  } else {
    shopifyDetails.push(`Store: ${ctx.shopifyConnection?.shop || "connected"}`);
    shopifyDetails.push("Draft-only publishing");
    if (inspection) {
      shopifyStatus =
        inspection.status === "ready"
          ? "ready"
          : inspection.status === "needs-review"
            ? "needs-review"
            : "blocked";
      shopifyDesc = `Pack inspection: ${inspection.status.replace("-", " ")}.`;
      inspection.checks
        .filter((c) => c.status !== "pass")
        .forEach((c) => {
          shopifyBlocking.push(`shopify-${c.id}`);
          shopifyDetails.push(`${c.label}: ${c.detail}`);
        });
    } else {
      shopifyStatus = manifestValid && proofSummary.blocking === 0 ? "needs-review" : "blocked";
      shopifyDesc = "Export a Shopify pack from the artifact, then inspect before handoff.";
      shopifyDetails.push("Pack not inspected in this session");
    }
  }

  const shopifyDraft: ReleaseDestination = {
    id: "shopify-draft",
    label: "Shopify draft",
    status: shopifyStatus,
    description: shopifyDesc,
    previewAvailable: !!inspection,
    publishAvailable: shopifyConnected && shopifyStatus === "ready",
    blockingCheckIds: shopifyBlocking,
    detailLines: shopifyDetails,
  };

  const newsletter: ReleaseDestination = {
    id: "newsletter",
    label: "Newsletter",
    status: "not-configured",
    description: "No newsletter provider connected. RSS/Keep Tabs feed serves public issues.",
    previewAvailable: false,
    publishAvailable: false,
    blockingCheckIds: [],
    detailLines: ["Provider: not connected", "Keep Tabs: /u/:handle/feed.xml when public"],
  };

  const socialStatus: ReadinessStatus =
    missingAlt.length > 0 ? "needs-review" : imagePages.length > 0 ? "ready" : "not-configured";
  const socialPlates: ReleaseDestination = {
    id: "social-plates",
    label: "Social plates",
    status: socialStatus,
    description:
      missingAlt.length > 0
        ? `${missingAlt.length} image(s) missing alt text before social export.`
        : imagePages.length > 0
          ? "Caption and alt text ready for plate export."
          : "No visual plates to export.",
    previewAvailable: imagePages.length > 0,
    publishAvailable: missingAlt.length === 0 && imagePages.length > 0,
    blockingCheckIds: missingAlt.length > 0 ? ["alt-text-missing"] : [],
    detailLines: [
      `${imagePages.length} plate dimension(s) available`,
      missingAlt.length > 0
        ? `${missingAlt.length} missing alt text`
        : "Alt text complete",
    ],
  };

  return [webIssue, archivalPdf, assetPackage, shopifyDraft, newsletter, socialPlates];
}

function buildApprovals(
  metadata: ZineMetadata,
  proofDiagnostics: ZineProofDiagnostic[],
  missingAlt: { pageNumber: number; headline?: string }[],
  intelHandoff: IntelHubPressHandoff | null | undefined,
): ApprovalItem[] {
  const items: ApprovalItem[] = [];

  if (!metadata.coverImageUrl) {
    items.push({
      id: `approval-cover-${metadata.id}`,
      artifactId: metadata.id,
      artifactTitle: metadata.title || "Untitled",
      label: "Select a final cover",
      fieldRef: "coverImageUrl",
      status: "pending",
      summary: "No studio cover plate attached to this artifact.",
      actionLabel: "Open Studio",
      actionPath: "/studio",
    });
  }

  proofDiagnostics
    .filter((d) => d.severity === "blocking")
    .slice(0, 5)
    .forEach((d, i) => {
      items.push({
        id: `approval-proof-${metadata.id}-${i}`,
        artifactId: metadata.id,
        artifactTitle: metadata.title || "Untitled",
        label: d.message,
        fieldRef: d.pageId || d.id,
        status: "pending",
        summary: d.correction,
        timestamp: metadata.updatedAt,
        actionLabel: "Review proof",
        actionPath: "/studio",
      });
    });

  missingAlt.slice(0, 5).forEach((page) => {
    items.push({
      id: `approval-alt-${metadata.id}-${page.pageNumber}`,
      artifactId: metadata.id,
      artifactTitle: metadata.title || "Untitled",
      label: `Add alt text — page ${page.pageNumber}`,
      fieldRef: `pages[${page.pageNumber}].altText`,
      status: "pending",
      summary: page.headline
        ? `Image on "${page.headline}" needs a description.`
        : "Visual plate missing alt text.",
      actionLabel: "Edit page",
      actionPath: "/studio",
    });
  });

  if (!metadata.isPublic && metadata.lifecycleStatus !== "published") {
    items.push({
      id: `approval-public-${metadata.id}`,
      artifactId: metadata.id,
      artifactTitle: metadata.title || "Untitled",
      label: "Make issue public",
      fieldRef: "isPublic",
      status: "pending",
      summary:
        "Publishing requires Mean Median Mode disclosure consent. Issue stays private until approved.",
      actionLabel: "Preview public issue",
      actionPath: `/s/${metadata.id}`,
      persistenceNote: "Public state persists via Firestore when publish is confirmed in Export.",
    });
  }

  if (intelHandoff) {
    items.push({
      id: `approval-intel-${intelHandoff.id}`,
      artifactId: metadata.id,
      artifactTitle: intelHandoff.clientName,
      label: "Approve Intel Hub commerce candidate",
      fieldRef: "intelHubPressHandoff",
      status: "pending",
      summary: intelHandoff.thesis,
      timestamp: intelHandoff.compiledAt,
      actionLabel: "Review Intel pack",
      actionPath: "/intelhub",
      persistenceNote: "Approval updates intel project run in localStorage.",
    });
  }

  return items;
}

function deriveHistory(metadata: ZineMetadata, artifactRevision: number): ReleaseHistoryEntry[] {
  const entries: ReleaseHistoryEntry[] = [];

  if (metadata.publishedAt && metadata.isPublic) {
    entries.push({
      id: `hist-pub-${metadata.id}`,
      artifactId: metadata.id,
      artifactVersion: artifactRevision,
      timestamp: metadata.publishedAt,
      kind: "made-public",
      destination: "web-issue",
      result: "Issue made public",
      publicUrl: metadata.publication?.canonicalUrl || `https://mimi.fish/s/${metadata.id}`,
      source: "artifact",
    });
  }

  if (metadata.exportState?.lastExportedAt) {
    entries.push({
      id: `hist-export-${metadata.id}`,
      artifactId: metadata.id,
      artifactVersion: artifactRevision,
      timestamp: metadata.exportState.lastExportedAt,
      kind: "exported",
      destination: (metadata.exportState.formats || []).join(", ") || "export",
      result: "Export recorded on artifact",
      filesProduced: metadata.exportState.formats,
      source: "artifact",
    });
  }

  (metadata.revisions || []).forEach((rev) => {
    entries.push({
      id: `hist-rev-${metadata.id}-${rev.revision}`,
      artifactId: metadata.id,
      artifactVersion: rev.revision,
      timestamp: rev.createdAt,
      kind: "revision",
      destination: "artifact",
      result: rev.reason || `Revision ${rev.revision}`,
      source: "revision",
    });
  });

  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

function buildRecommendation(
  overallStatus: ReadinessStatus,
  unresolvedCount: number,
  destinations: ReleaseDestination[],
  checks: ReleaseCheck[],
  approvals: ApprovalItem[],
): ReleaseRecommendation {
  const evidence: string[] = [];
  const rationale: string[] = [];

  const web = destinations.find((d) => d.id === "web-issue");
  const shopify = destinations.find((d) => d.id === "shopify-draft");
  const social = destinations.find((d) => d.id === "social-plates");

  if (checks.some((c) => c.id.startsWith("proof-") && c.status === "ready")) {
    evidence.push("Proof sequence valid");
  }
  if (checks.some((c) => c.id === "meta-title" && c.status === "ready")) {
    evidence.push("Metadata stamped");
  }
  if (web?.status === "ready" || web?.publishAvailable) {
    evidence.push("Public share route ready");
  }
  checks
    .filter((c) => c.id.includes("alt") || c.label.toLowerCase().includes("alt text"))
    .forEach((c) => evidence.push(c.label));
  if (shopify?.status === "needs-review") {
    evidence.push("Shopify pack contains warnings");
  }
  if (checks.some((c) => c.id === "context-editorial-compile" && c.status === "ready")) {
    evidence.push("Editorial compile attached");
  }
  checks
    .filter((c) => c.status === "blocked" && c.id.startsWith("rights-"))
    .forEach((c) => evidence.push(c.label));

  let headline = "";
  let primaryActionLabel = "Review checks";
  let primaryActionPath = "/studio";

  if (overallStatus === "blocked") {
    const blocking = checks.filter((c) => c.status === "blocked");
    headline =
      blocking.length > 0
        ? `Blocked — resolve ${blocking.length} issue(s) before publishing.`
        : "Blocked — proof or metadata failures prevent release.";
    primaryActionLabel = "Review blocking checks";
    rationale.push(blocking[0]?.summary || "Resolve blocking proof or metadata checks.");
  } else if (overallStatus === "needs-review" || unresolvedCount > 0) {
    const parts: string[] = [];
    if (web?.publishAvailable) {
      parts.push("Publish the web issue now");
    }
    if (shopify?.status === "needs-review" || shopify?.status === "blocked") {
      parts.push("Hold the Shopify product until pack warnings are resolved");
    }
    if (social?.status === "needs-review") {
      const altPending = approvals.filter((a) => a.label.includes("alt text")).length;
      if (altPending > 0) {
        parts.push(
          `review ${altPending} missing image description${altPending > 1 ? "s" : ""} before exporting social plates`,
        );
      }
    }
    headline =
      parts.length > 0
        ? parts.join(". ") + "."
        : `Ready with ${unresolvedCount} check${unresolvedCount === 1 ? "" : "s"} remaining.`;
    primaryActionLabel =
      unresolvedCount > 0 ? `Review ${unresolvedCount} check${unresolvedCount === 1 ? "" : "s"}` : "Preview issue";
    primaryActionPath = unresolvedCount > 0 ? "/studio" : web?.detailLines?.[1]?.replace("Share: ", "") || "/studio";
    rationale.push(...checks.filter((c) => c.status !== "ready").map((c) => c.summary));
  } else {
    headline = "All release checks pass. Choose a destination to publish or export.";
    primaryActionLabel = "Preview issue";
    primaryActionPath = "/studio";
    rationale.push("Artifact is complete, sourced, and packaged for release.");
  }

  if (approvals.length > 0 && overallStatus !== "blocked") {
    rationale.push(`${approvals.length} item(s) await your approval.`);
  }

  return {
    headline,
    rationale,
    evidence,
    primaryActionLabel,
    primaryActionPath,
  };
}

function stageFromChecks(
  id: ReleaseStageId,
  label: string,
  checks: ReleaseCheck[],
  actionLabel?: string,
  actionPath?: string,
): ReleaseStage {
  const unresolved = countUnresolved(checks);
  const status = worstStatus(checks.map((c) => c.status));
  const summary =
    unresolved === 0
      ? "Complete"
      : `${unresolved} item${unresolved === 1 ? "" : "s"} need attention`;
  return {
    id,
    label,
    status: checks.length === 0 ? "ready" : status,
    summary,
    unresolvedCount: unresolved,
    checks,
    actionLabel,
    actionPath,
  };
}

export function deriveArtifactReleaseReadiness(
  metadata: ZineMetadata,
  ctx: ReleaseReadinessContext = {},
): ArtifactReleaseReadiness {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const artifact = normalizeZineArtifact(hydrated);
  const proofPages = buildZineProofSequence(artifact);
  const proofDiagnostics = buildZineProofDiagnostics(artifact, proofPages);
  const proofSummary = summarizeZineProof(proofDiagnostics);

  const manifest = buildExportManifest(hydrated);
  const manifestValidation = validateExportManifest(manifest);
  const metaChecks = manifest.diagnostics.map(exportDiagToCheck);
  const proofChecks = proofToChecks(proofDiagnostics);
  const rightsChecks = buildRightsChecks(proofDiagnostics, hydrated);

  const pendingCompile = getEditorialCompileExport(hydrated.userId, true);
  const editorialAttached =
    !!manifest.editorialCompileMarkdown?.trim() || !!pendingCompile?.markdown?.trim();
  const contextChecks = buildContextChecks(hydrated, editorialAttached);

  const missingAlt = pagesMissingAltText(hydrated);
  if (missingAlt.length > 0) {
    contextChecks.push({
      id: "alt-text-missing",
      label: `${missingAlt.length} image(s) missing alt text`,
      status: "needs-review",
      summary: "Add descriptions before social plate export.",
      evidence: missingAlt.map((p) => `Page ${p.pageNumber}`),
      actionLabel: "Edit pages",
      actionPath: "/studio",
    });
  }

  const intelHandoff = ctx.intelHandoff ?? readIntelHubPressHandoff();
  const destinations = buildDestinations(
    hydrated,
    proofSummary,
    manifestValidation.ok,
    missingAlt,
    ctx,
  );

  const destinationChecks: ReleaseCheck[] = destinations
    .filter((d) => d.status !== "not-configured" && d.status !== "ready")
    .map((d) => ({
      id: `dest-${d.id}`,
      label: d.label,
      status: d.status,
      summary: d.description,
      evidence: d.detailLines,
    }));

  const stages: ReleaseStage[] = [
    stageFromChecks("proof", "Proof", proofChecks, "Review proof", "/studio"),
    stageFromChecks("metadata", "Metadata", metaChecks),
    stageFromChecks("rights", "Rights", rightsChecks, "Review rights", "/studio"),
    stageFromChecks("context", "Context", contextChecks, "Review context", "/scribe"),
    stageFromChecks(
      "destinations",
      "Destinations",
      destinationChecks.length > 0
        ? destinationChecks
        : [{ id: "dest-ready", label: "Destinations", status: "ready", summary: "All configured destinations ready." }],
      "View destinations",
    ),
    {
      id: "publish",
      label: "Publish",
      status: worstStatus([
        ...stages_placeholder_status(proofSummary, manifestValidation.ok, destinations),
      ]),
      summary: "",
      unresolvedCount: 0,
      checks: [],
    },
  ];

  // Fix publish stage — compute after other stages
  const stageStatuses = stages.slice(0, 5).map((s) => s.status);
  const publishUnresolved = stages
    .slice(0, 5)
    .reduce((sum, s) => sum + s.unresolvedCount, 0);
  stages[5] = {
    id: "publish",
    label: "Publish",
    status: worstStatus(stageStatuses),
    summary:
      publishUnresolved === 0
        ? "Ready to publish or export."
        : `${publishUnresolved} check(s) remain before release.`,
    unresolvedCount: publishUnresolved,
    checks: [],
    actionLabel: publishUnresolved > 0 ? "Resolve checks" : "Choose destination",
  };

  const allChecks = [
    ...proofChecks,
    ...metaChecks,
    ...rightsChecks,
    ...contextChecks,
    ...destinationChecks,
  ];
  const approvals = buildApprovals(hydrated, proofDiagnostics, missingAlt, intelHandoff);
  const unresolvedCount = countUnresolved(allChecks) + approvals.filter((a) => a.status === "pending").length;

  const overallStatus = worstStatus([
    worstStatus(stageStatuses),
    ...approvals.filter((a) => a.status === "pending").map(() => "needs-review" as ReadinessStatus),
  ]);

  let overallSummary = "Ready to release";
  if (overallStatus === "blocked") {
    overallSummary = "Blocked — resolve blocking checks";
  } else if (unresolvedCount > 0) {
    overallSummary = `Ready with ${unresolvedCount} check${unresolvedCount === 1 ? "" : "s"} remaining`;
  }

  const history = deriveHistory(hydrated, artifact.revision);
  const recommendation = buildRecommendation(
    overallStatus,
    unresolvedCount,
    destinations,
    allChecks,
    approvals,
  );

  // Fix recommendation primary path for preview
  if (recommendation.primaryActionLabel === "Preview issue" && hydrated.id) {
    recommendation.primaryActionPath = `https://mimi.fish/s/${hydrated.id}`;
  }

  const artifactType = hydrated.isLite ? "Lite issue" : "Editorial zine";

  return {
    artifactId: hydrated.id,
    title: hydrated.title || hydrated.content?.title || "Untitled",
    artifactType,
    version: artifact.revision,
    overallStatus,
    overallSummary,
    unresolvedCount,
    stages,
    destinations,
    checks: allChecks,
    approvals,
    recommendation,
    history,
    historyNote:
      history.length === 0
        ? "No release events on this artifact yet. Publication and export history will appear when persisted on the artifact or server audit log ships."
        : "History derived from artifact timestamps and revisions — not a full server audit log.",
  };
}

function stages_placeholder_status(
  proofSummary: ReturnType<typeof summarizeZineProof>,
  manifestOk: boolean,
  destinations: ReleaseDestination[],
): ReadinessStatus[] {
  const statuses: ReadinessStatus[] = [];
  if (proofSummary.blocking > 0) statuses.push("blocked");
  if (!manifestOk) statuses.push("blocked");
  destinations.forEach((d) => {
    if (d.publishAvailable) statuses.push("ready");
    else if (d.status === "blocked") statuses.push("blocked");
    else if (d.status === "needs-review") statuses.push("needs-review");
  });
  return statuses.length > 0 ? statuses : ["ready"];
}

export function readinessStatusLabel(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "needs-review":
      return "Needs review";
    case "blocked":
      return "Blocked";
    case "not-configured":
      return "Not configured";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function readinessStatusSymbol(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "✓";
    case "needs-review":
      return "!";
    case "blocked":
      return "✕";
    case "not-configured":
      return "—";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
