import { UsedContextSnapshot, ZineMetadata } from "../types";
import { sanitizeUsedContextForExport } from "../lib/privacyUtils";
import { getEditorialCompileExport } from "../lib/editCompileExport";
import { readStudioCoverOverlays } from "../lib/studioCoverExport";

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
  studioCoverOverlays?: ReturnType<typeof readStudioCoverOverlays>;
  coverOverlayBaked?: boolean;
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
      source: undefined,
    })),
  );

  const pendingCompile = getEditorialCompileExport();
  const editorialCompileMarkdown =
    metadata.editorialCompileMarkdown || pendingCompile?.markdown;
  const editorialCompileCompiledAt =
    metadata.editorialCompileCompiledAt || pendingCompile?.compiledAt;
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
    studioCoverOverlays,
    coverOverlayBaked,
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
