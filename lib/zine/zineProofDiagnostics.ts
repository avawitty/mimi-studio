import type {
  EditorElement,
  MimiZineArtifact,
  ZinePageSpec,
} from "../../types";
import { validateZineReadingOrder } from "./zineReadingOrder";

export type ZineProofDiagnosticSeverity = "blocking" | "warning" | "info";

export type ZineProofDiagnosticId =
  | "text-overflow"
  | "missing-media"
  | "low-resolution"
  | "absent-provenance"
  | "private-context-exposure"
  | "unsupported-image-embedding"
  | "missing-title"
  | "missing-creator"
  | "duplicate-page-number"
  | "unresolved-generation"
  | "font-substitution"
  | "invalid-reading-order"
  | "unapproved-direction";

export interface ZineProofDiagnostic {
  id: ZineProofDiagnosticId;
  severity: ZineProofDiagnosticSeverity;
  message: string;
  pageId?: string;
  elementId?: string;
  correction: string;
}

const EMBEDDABLE_IMAGE_PROTOCOL = /^(https?:|data:image\/)/i;
const PDF_SAFE_FONT_FAMILIES = new Set([
  "times",
  "times new roman",
  "georgia",
  "cormorant garamond",
  "helvetica",
  "arial",
]);

function pageId(page: ZinePageSpec, index: number): string {
  return page.id || `page-${page.pageNumber || index + 1}`;
}

function imageElements(page: ZinePageSpec): EditorElement[] {
  return (page.customLayout?.elements || []).filter(
    (element) => element.type === "image" && Boolean(element.content),
  );
}

function textElements(page: ZinePageSpec): EditorElement[] {
  return (page.customLayout?.elements || []).filter(
    (element) => element.type === "text" && Boolean(element.content),
  );
}

function elementOverflows(element: EditorElement): boolean {
  const widthOverflow =
    element.style.left < 0 ||
    element.style.width <= 0 ||
    element.style.left + element.style.width > 100;
  const height = element.style.height;
  const heightOverflow =
    element.style.top < 0 ||
    element.style.top > 100 ||
    (height != null && (height <= 0 || element.style.top + height > 100));
  if (widthOverflow || heightOverflow) return true;
  if (element.type !== "text" || height != null) return false;

  const fontSize = Math.max(0.5, element.style.fontSize || 1);
  const lineHeight = Math.max(1, element.style.lineHeight || 1.4);
  const estimatedCharactersPerLine = Math.max(
    8,
    Math.floor((element.style.width / fontSize) * 1.65),
  );
  const estimatedLines = Math.ceil(
    element.content.length / estimatedCharactersPerLine,
  );
  const estimatedHeightPercent = estimatedLines * fontSize * lineHeight * 1.35;
  return element.style.top + estimatedHeightPercent > 100;
}

function imageUrls(page: ZinePageSpec): string[] {
  const urls = new Set<string>();
  if (page.image_url) urls.add(page.image_url);
  imageElements(page).forEach((element) => urls.add(element.content));
  return [...urls];
}

function pushPageDiagnostics(
  diagnostics: ZineProofDiagnostic[],
  page: ZinePageSpec,
  index: number,
): void {
  const id = pageId(page, index);
  const pageImages = imageUrls(page);
  const mediaRequired =
    page.grammar === "specimen" ||
    page.grammar === "editorial-split" ||
    page.grammar === "dark-plate" ||
    page.sectionType === "visual-plate";

  if (mediaRequired && pageImages.length === 0) {
    diagnostics.push({
      id: "missing-media",
      severity: "warning",
      pageId: id,
      message: `Page ${page.pageNumber} has no visual plate.`,
      correction: "Replace the image, retry its source, or keep the intentional placeholder.",
    });
  }

  pageImages.forEach((url) => {
    if (!EMBEDDABLE_IMAGE_PROTOCOL.test(url)) {
      diagnostics.push({
        id: "unsupported-image-embedding",
        severity: "warning",
        pageId: id,
        message: `Page ${page.pageNumber} uses an image source that structured export cannot embed.`,
        correction: "Upload a copy or export with an intentional image placeholder.",
      });
    }
  });

  const variants = page.assetVariants;
  if (
    variants?.width != null &&
    variants.height != null &&
    (variants.width < 1000 || variants.height < 1000)
  ) {
    diagnostics.push({
      id: "low-resolution",
      severity: "warning",
      pageId: id,
      message: `Page ${page.pageNumber} master is ${variants.width}×${variants.height}.`,
      correction: "Replace it with a larger export master; keep the preview for the editor.",
    });
  }

  if (
    (page.sectionType === "evidence" || page.grammar === "evidence-ledger") &&
    (page.sourceIds?.length || 0) === 0
  ) {
    diagnostics.push({
      id: "absent-provenance",
      severity: "warning",
      pageId: id,
      message: `Evidence page ${page.pageNumber} has no source references.`,
      correction: "Attach source IDs or reclassify the page as interpretation.",
    });
  }

  textElements(page).forEach((element) => {
    if (elementOverflows(element)) {
      diagnostics.push({
        id: "text-overflow",
        severity: "blocking",
        pageId: id,
        elementId: element.id,
        message: `Text element “${element.id}” may leave the page frame.`,
        correction: "Resize the text box, reduce copy, or move it inside the safe area.",
      });
    }

    const font = element.style.fontFamily?.trim().toLowerCase();
    if (font && !PDF_SAFE_FONT_FAMILIES.has(font)) {
      diagnostics.push({
        id: "font-substitution",
        severity: "warning",
        pageId: id,
        elementId: element.id,
        message: `“${element.style.fontFamily}” will be substituted in archival PDF.`,
        correction: "Accept the Times/Helvetica substitution or choose a PDF-safe face.",
      });
    }
  });

  const readingOrder = validateZineReadingOrder(page);
  if (!readingOrder.valid) {
    diagnostics.push({
      id: "invalid-reading-order",
      severity: "blocking",
      pageId: id,
      message: `Page ${page.pageNumber} reading order contains missing, duplicate, or omitted elements.`,
      correction: "Repair readingOrder so it references every custom element exactly once.",
    });
  }
}

export function buildZineProofDiagnostics(
  artifact: MimiZineArtifact,
  proofPages?: ZinePageSpec[],
): ZineProofDiagnostic[] {
  const diagnostics: ZineProofDiagnostic[] = [];
  const pages = proofPages ?? artifact.pages;

  if (!artifact.identity.title.trim()) {
    diagnostics.push({
      id: "missing-title",
      severity: "blocking",
      message: "The issue has no title.",
      correction: "Add an issue title before approval.",
    });
  }
  if (!artifact.authorship.creatorHandle.trim()) {
    diagnostics.push({
      id: "missing-creator",
      severity: "blocking",
      message: "The issue has no creator handle.",
      correction: "Restore creator authorship before approval.",
    });
  }
  if (!artifact.direction.approved) {
    diagnostics.push({
      id: "unapproved-direction",
      severity: "blocking",
      message: "This proof uses an unapproved editorial direction.",
      correction: "Approve the direction or return to direction revision.",
    });
  }
  if (
    !artifact.reading.centralObservation.trim() ||
    pages.length === 0
  ) {
    diagnostics.push({
      id: "unresolved-generation",
      severity: "blocking",
      message:
        pages.length === 0
          ? "The issue has no drafted pages."
          : "The issue has no central observation.",
      correction: "Complete the reading and draft unresolved pages.",
    });
  }

  const pageNumbers = new Map<number, number>();
  artifact.pages.forEach((page) => {
    pageNumbers.set(
      page.pageNumber,
      (pageNumbers.get(page.pageNumber) || 0) + 1,
    );
  });
  [...pageNumbers.entries()]
    .filter(([, count]) => count > 1)
    .forEach(([pageNumber]) => {
      diagnostics.push({
        id: "duplicate-page-number",
        severity: "blocking",
        message: `Page number ${pageNumber} appears more than once in authored pages.`,
        correction: "Renumber the issue sequence before approval.",
      });
    });

  const proofPageNumbers = new Map<number, number>();
  pages.forEach((page) => {
    proofPageNumbers.set(
      page.pageNumber,
      (proofPageNumbers.get(page.pageNumber) || 0) + 1,
    );
  });
  [...proofPageNumbers.entries()]
    .filter(([, count]) => count > 1)
    .forEach(([pageNumber]) => {
      diagnostics.push({
        id: "duplicate-page-number",
        severity: "blocking",
        message: `Proof page number ${pageNumber} appears more than once.`,
        correction: "Repair the proof sequence before approval.",
      });
    });

  const snapshotsById = new Map(
    artifact.sourcePacket.usedContextSnapshots.map((snapshot) => [
      snapshot.atomId,
      snapshot,
    ]),
  );
  const exposedPrivateIds = artifact.colophon.publicSourceIds.filter((id) => {
    const snapshot = snapshotsById.get(id);
    return snapshot && snapshot.visibility?.public === false;
  });
  if (
    artifact.publication.visibility === "public" &&
    exposedPrivateIds.length > 0
  ) {
    diagnostics.push({
      id: "private-context-exposure",
      severity: "blocking",
      message: `${exposedPrivateIds.length} private source reference(s) are marked for the public colophon.`,
      correction: "Remove those sources from public provenance or change their visibility deliberately.",
    });
  }

  pages.forEach((page, index) => {
    pushPageDiagnostics(diagnostics, page, index);
  });

  return diagnostics;
}

export function summarizeZineProof(
  diagnostics: ZineProofDiagnostic[],
): {
  canApprove: boolean;
  blocking: number;
  warnings: number;
} {
  const blocking = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "blocking",
  ).length;
  const warnings = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;
  return { canApprove: blocking === 0, blocking, warnings };
}
