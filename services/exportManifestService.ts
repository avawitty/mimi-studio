import { UsedContextSnapshot, ZineMetadata } from "../types";
import { sanitizeUsedContextForExport } from "../lib/privacyUtils";
import { getEditorialCompileExport } from "../lib/editCompileExport";
import { readStudioCoverOverlays } from "../lib/studioCoverExport";
import { summarizePagesForExport, type StructuredPdfPageSummary } from "../lib/structuredZinePdf";

export interface ExportDiagnostic {
  id: string;
  label: string;
  pass: boolean;
  message?: string;
}

export interface ExportManifest {
  artifactId: string;
  title: string;
  tone?: string;
  creatorHandle: string;
  theme?: string;
  coverImageUrl?: string | null;
  fragmentsUsed: string[];
  usedContextSnapshots: UsedContextSnapshot[];
  editorialCompileMarkdown?: string;
  editorialCompileCompiledAt?: number;
  editorialCompileOwnerUid?: string;
  editorialCompileOwnerHandle?: string;
  editorialCompileLinkVersion?: number;
  studioCoverOverlays?: ReturnType<typeof readStudioCoverOverlays>;
  coverOverlayBaked?: boolean;
  /** Plate summaries for Press — geometry stays on the artifact pages. */
  pages?: StructuredPdfPageSummary[];
  /** How PDF extraction should be produced for this pack. */
  pdfMode?: "structured" | "raster";
  exportedAt: number;
  diagnostics: ExportDiagnostic[];
}

export function buildExportManifest(
  metadata: ZineMetadata,
  snapshots?: UsedContextSnapshot[],
): ExportManifest {
  const usedContextSnapshots = sanitizeUsedContextForExport(
    snapshots ||
    metadata.usedContextSnapshots ||
    (metadata.fragmentsUsed || []).map((id) => ({
      atomId: id,
      title: "Fragment",
      content: "",
      source: undefined as any,
    })),
  );

  const metadataCompileMatchesOwner =
    !!metadata.editorialCompileOwnerUid &&
    metadata.editorialCompileOwnerUid === metadata.userId;
  if (metadata.editorialCompileMarkdown && !metadataCompileMatchesOwner) {
    console.warn("MIMI // Skipping metadata editorial compile due to owner mismatch or missing owner.", {
      zineId: metadata.id,
      zineOwner: metadata.userId,
      compileOwner: metadata.editorialCompileOwnerUid,
    });
  }
  const pendingCompile = getEditorialCompileExport(metadata.userId, true);
  const editorialCompileMarkdown =
    (metadataCompileMatchesOwner ? metadata.editorialCompileMarkdown : undefined) ||
    pendingCompile?.markdown;
  const editorialCompileCompiledAt =
    (metadataCompileMatchesOwner ? metadata.editorialCompileCompiledAt : undefined) ||
    pendingCompile?.compiledAt;
  const editorialCompileOwnerUid =
    (metadataCompileMatchesOwner ? metadata.editorialCompileOwnerUid : undefined) ||
    pendingCompile?.profileLink?.ownerUid;
  const editorialCompileOwnerHandle =
    (metadataCompileMatchesOwner ? metadata.editorialCompileOwnerHandle : undefined) ||
    pendingCompile?.profileLink?.ownerHandle;
  const editorialCompileLinkVersion =
    (metadataCompileMatchesOwner ? metadata.editorialCompileLinkVersion : undefined) ||
    pendingCompile?.profileLink?.version;
  const studioCoverOverlays = readStudioCoverOverlays(metadata);
  const coverOverlayBaked = !!(
    metadata.coverImageUrl &&
    studioCoverOverlays?.length &&
    metadata.coverImageUrl.startsWith("data:image")
  );

  const diagnostics: ExportDiagnostic[] = [
    {
      id: "artifact-id",
      label: "Artifact ID",
      pass: !!metadata.id,
      message: metadata.id || "Missing artifact id",
    },
    {
      id: "title",
      label: "Title",
      pass: !!(metadata.title || metadata.content?.title),
      message: metadata.title || "Missing title",
    },
    {
      id: "creator",
      label: "Creator handle",
      pass: !!metadata.userHandle,
      message: metadata.userHandle || "Missing creator handle",
    },
    {
      id: "tone",
      label: "Tone tag",
      pass: !!metadata.tone,
      message: metadata.tone || "Missing tone",
    },
    {
      id: "content",
      label: "Zine content",
      pass: !!metadata.content?.pages?.length || !!metadata.content?.oracular_mirror,
      message: "Structured content present",
    },
    {
      id: "used-context",
      label: "Used Context provenance",
      pass:
        (metadata.fragmentsUsed?.length ?? 0) === 0 ||
        usedContextSnapshots.some((s) => s.atomId),
      message:
        (metadata.fragmentsUsed?.length ?? 0) > 0
          ? `${metadata.fragmentsUsed!.length} scribe atom(s) referenced`
          : "No scribe atoms (optional)",
    },
    {
      id: "cover-image",
      label: "Studio cover plate",
      pass: !!metadata.coverImageUrl,
      message: metadata.coverImageUrl
        ? studioCoverOverlays?.length
          ? coverOverlayBaked
            ? "Cover plate with baked overlay layers"
            : "Cover plate attached; overlay metadata preserved (bake on export)"
          : "Cover image attached from Studio compose"
        : "No cover image (optional)",
    },
    {
      id: "editorial-compile",
      label: "The Edit compile markdown",
      pass: !!editorialCompileMarkdown?.trim(),
      message: editorialCompileMarkdown?.trim()
        ? "Editorial compile attached for Press export"
        : "No editorial compile (optional)",
    },
  ];

  return {
    artifactId: metadata.id,
    title: metadata.title || metadata.content?.title || "Untitled",
    tone: metadata.tone,
    creatorHandle: metadata.userHandle,
    theme: metadata.theme,
    coverImageUrl: metadata.coverImageUrl,
    fragmentsUsed: metadata.fragmentsUsed || [],
    usedContextSnapshots,
    editorialCompileMarkdown,
    editorialCompileCompiledAt,
    editorialCompileOwnerUid,
    editorialCompileOwnerHandle,
    editorialCompileLinkVersion,
    studioCoverOverlays,
    coverOverlayBaked,
    pages: summarizePagesForExport(metadata),
    pdfMode: "structured",
    exportedAt: Date.now(),
    diagnostics,
  };
}

export function validateExportManifest(manifest: ExportManifest): {
  ok: boolean;
  failures: string[];
} {
  const failures = manifest.diagnostics
    .filter(
      (d) =>
        !d.pass &&
        d.id !== "used-context" &&
        d.id !== "cover-image" &&
        d.id !== "editorial-compile",
    )
    .map((d) => d.message || d.label);
  return { ok: failures.length === 0, failures };
}
