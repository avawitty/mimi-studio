import { jsPDF } from "jspdf";
import type { EditorElement, ZineMetadata, ZinePageSpec } from "../types";
import { resolveZineExportCoverUrl } from "./studioCoverExport";
import { pageHasCustomLayout } from "./zineSpreadLayout";
import { exportAssetUrl } from "./zine/zinePerformance";
import { hydrateLegacyZineMetadata } from "./zine/zineMigrations";

export type StructuredPdfSectionId =
  | "cover"
  | "reading"
  | "signals"
  | "plates"
  | "roadmap"
  | "debris";

export interface StructuredPdfOptions {
  sections?: Iterable<string>;
  /** Draw customLayout elements when present (default true). */
  includeCustomLayouts?: boolean;
}

export interface StructuredPdfPageSummary {
  pageNumber: number;
  headline: string;
  hasCustomLayout: boolean;
  imageUrl?: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const INK = { r: 10, g: 10, b: 10 };
const STONE = { r: 120, g: 113, b: 108 };
const HAIRLINE = { r: 212, g: 212, b: 212 };

function safeFilename(title: string): string {
  return (title || "Untitled").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "Untitled";
}

function asSectionSet(sections?: Iterable<string>): Set<string> {
  if (!sections) {
    return new Set(["cover", "reading", "signals", "plates", "roadmap", "debris"]);
  }
  return sections instanceof Set ? sections : new Set(sections);
}

/** Fetch remote/data URL into a jsPDF-friendly payload. Soft-fails to null. */
export async function fetchImageForPdf(
  url: string | null | undefined,
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) {
      const format: "JPEG" | "PNG" = /image\/png/i.test(url) ? "PNG" : "JPEG";
      return { dataUrl: url, format };
    }
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (!dataUrl.startsWith("data:")) return null;
    const format: "JPEG" | "PNG" = /image\/png/i.test(blob.type || dataUrl) ? "PNG" : "JPEG";
    return { dataUrl, format };
  } catch (error) {
    console.warn("MIMI // structured PDF: image fetch failed", error);
    return null;
  }
}

function drawHairline(doc: jsPDF, y: number): void {
  doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function drawFooter(doc: jsPDF, label: string): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text("Mimi · editorial archive", MARGIN, PAGE_H - 10);
  doc.text(label, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
}

function ensurePage(doc: jsPDF, pageIndex: number): number {
  if (pageIndex === 0) return 0;
  doc.addPage();
  return pageIndex;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "", maxWidth) as string[];
}

function drawCover(
  doc: jsPDF,
  metadata: ZineMetadata,
  cover: { dataUrl: string; format: "JPEG" | "PNG" } | null,
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  if (cover) {
    const imgW = PAGE_W - MARGIN * 2;
    const imgH = 120;
    try {
      doc.addImage(cover.dataUrl, cover.format, MARGIN, MARGIN, imgW, imgH, undefined, "FAST");
    } catch {
      // placeholder frame
      doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
      doc.rect(MARGIN, MARGIN, imgW, imgH);
    }
  }

  const titleY = cover ? MARGIN + 140 : 80;
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setFont("times", "italic");
  doc.setFontSize(32);
  const titleLines = wrapText(doc, metadata.title || "Untitled Manifest", PAGE_W - MARGIN * 2);
  doc.text(titleLines.slice(0, 4), MARGIN, titleY);

  const afterTitle = titleY + titleLines.slice(0, 4).length * 12 + 8;
  drawHairline(doc, afterTitle);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text(`@${metadata.userHandle || "curator"}`, MARGIN, afterTitle + 12);
  doc.text(
    `${metadata.tone || "editorial"} · ${new Date(metadata.timestamp || Date.now()).toLocaleDateString()}`,
    MARGIN,
    afterTitle + 20,
  );
  doc.setFontSize(8);
  doc.text("ISSUE MANIFEST", MARGIN, afterTitle + 32);
  drawFooter(doc, "cover");
}

function drawReading(doc: jsPDF, metadata: ZineMetadata): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text("THE READING", MARGIN, MARGIN + 4);
  drawHairline(doc, MARGIN + 8);

  const mirror =
    metadata.content.oracular_mirror ||
    metadata.content.the_reading ||
    metadata.content.vocal_summary_blurb ||
    "";
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const mirrorLines = wrapText(doc, `"${mirror}"`, PAGE_W - MARGIN * 2);
  doc.text(mirrorLines.slice(0, 18), MARGIN, MARGIN + 24);

  const hypo = metadata.content.strategic_hypothesis || "";
  if (hypo) {
    const y = Math.min(MARGIN + 24 + mirrorLines.slice(0, 18).length * 7 + 16, PAGE_H - 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(STONE.r, STONE.g, STONE.b);
    doc.text("STRATEGIC HYPOTHESIS", MARGIN, y);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(wrapText(doc, hypo, PAGE_W - MARGIN * 2).slice(0, 10), MARGIN, y + 8);
  }
  drawFooter(doc, "reading");
}

function drawSignals(doc: jsPDF, metadata: ZineMetadata): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text("ARCHETYPE INDEX", MARGIN, MARGIN + 4);
  drawHairline(doc, MARGIN + 8);

  const signals = (metadata.content.semiotic_signals || []).filter(Boolean).slice(0, 6);
  let y = MARGIN + 22;
  signals.forEach((signal, i) => {
    if (y > PAGE_H - 40) return;
    doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y - 4, MARGIN, y + 18);
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(signal.motif || `Signal ${i + 1}`, MARGIN + 6, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(STONE.r, STONE.g, STONE.b);
    const ctx = wrapText(doc, signal.context || signal.targeting_rationale || "", PAGE_W - MARGIN * 2 - 8);
    doc.text(ctx.slice(0, 3), MARGIN + 6, y + 12);
    y += 28 + ctx.slice(0, 3).length * 3.5;
  });
  if (signals.length === 0) {
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(STONE.r, STONE.g, STONE.b);
    doc.text("No semiotic signals recorded for this issue.", MARGIN, MARGIN + 28);
  }
  drawFooter(doc, "signals");
}

function drawCustomLayout(
  doc: jsPDF,
  page: ZinePageSpec,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  images: Map<string, { dataUrl: string; format: "JPEG" | "PNG" }>,
): void {
  const elements = [...(page.customLayout?.elements || [])].sort(
    (a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0),
  );
  doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
  doc.setLineWidth(0.2);
  doc.rect(frameX, frameY, frameW, frameH);

  elements.forEach((el: EditorElement) => {
    const x = frameX + (el.style.left / 100) * frameW;
    const y = frameY + (el.style.top / 100) * frameH;
    const w = (el.style.width / 100) * frameW;
    const h = el.style.height != null ? (el.style.height / 100) * frameH : undefined;

    if (el.type === "image" && el.content) {
      const img = images.get(el.content) || images.get(page.image_url || "");
      if (img && h) {
        try {
          doc.addImage(img.dataUrl, img.format, x, y, w, h, undefined, "FAST");
        } catch {
          doc.rect(x, y, w, h || 20);
        }
      }
      return;
    }

    if (el.type === "text" && el.content) {
      const fontSize = Math.max(7, Math.min(22, (el.style.fontSize || 1) * 8));
      const isItalic = (el.style.fontStyle || "").includes("italic");
      doc.setFont("times", isItalic ? "italic" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(INK.r, INK.g, INK.b);
      const lines = wrapText(doc, el.content, w);
      doc.text(lines.slice(0, 12), x, y + fontSize * 0.35);
      return;
    }

    if (el.type === "box" || el.type === "signal" || el.type === "analysis_pin") {
      doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
      doc.rect(x, y, w, h || 8);
    }
  });
}

function drawDefaultPlate(
  doc: jsPDF,
  page: ZinePageSpec,
  index: number,
  image: { dataUrl: string; format: "JPEG" | "PNG" } | null,
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text(`FIG_0${index + 1}`, MARGIN, MARGIN + 4);
  doc.text("VISUAL PLATE", PAGE_W - MARGIN, MARGIN + 4, { align: "right" });
  drawHairline(doc, MARGIN + 8);

  const imgW = PAGE_W - MARGIN * 2;
  const imgH = 150;
  if (image) {
    try {
      doc.addImage(image.dataUrl, image.format, MARGIN, MARGIN + 14, imgW, imgH, undefined, "FAST");
    } catch {
      doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
      doc.rect(MARGIN, MARGIN + 14, imgW, imgH);
    }
  } else {
    doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
    doc.rect(MARGIN, MARGIN + 14, imgW, imgH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Plate image unavailable", MARGIN + 6, MARGIN + 14 + imgH / 2);
  }

  const textY = MARGIN + 14 + imgH + 14;
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const headline = wrapText(doc, page.headline || `Plate ${index + 1}`, imgW);
  doc.text(headline.slice(0, 3), MARGIN, textY);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  const body = wrapText(doc, page.bodyCopy || "", imgW);
  doc.text(body.slice(0, 12), MARGIN, textY + headline.slice(0, 3).length * 8 + 6);
  drawFooter(doc, `plate ${index + 1}`);
}

function drawComposedPlate(
  doc: jsPDF,
  page: ZinePageSpec,
  index: number,
  images: Map<string, { dataUrl: string; format: "JPEG" | "PNG" }>,
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text(`FIG_0${index + 1}`, MARGIN, MARGIN + 4);
  doc.text("COMPOSED SPREAD", PAGE_W - MARGIN, MARGIN + 4, { align: "right" });
  drawHairline(doc, MARGIN + 8);

  const frameX = MARGIN;
  const frameY = MARGIN + 14;
  const frameW = PAGE_W - MARGIN * 2;
  const frameH = PAGE_H - MARGIN * 2 - 24;
  drawCustomLayout(doc, page, frameX, frameY, frameW, frameH, images);
  drawFooter(doc, `composed ${index + 1}`);
}

function drawRoadmap(doc: jsPDF, metadata: ZineMetadata): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text("SIGNATURE / ROADMAP", MARGIN, MARGIN + 4);
  drawHairline(doc, MARGIN + 8);

  const roadmap = metadata.content.roadmap;
  let y = MARGIN + 24;
  const blocks: Array<{ label: string; value: string }> = [
    { label: "STRATEGIC THESIS", value: roadmap?.strategicThesis || metadata.content.the_roadmap || "" },
    { label: "POSITIONING AXIS", value: roadmap?.positioningAxis || "" },
    {
      label: "AUTHORITY ANCHOR",
      value: [
        roadmap?.authorityAnchor?.coreClaim
          ? `Core claim: ${roadmap.authorityAnchor.coreClaim}`
          : "",
        roadmap?.authorityAnchor?.repetitionVector
          ? `Repetition: ${roadmap.authorityAnchor.repetitionVector}`
          : "",
        roadmap?.authorityAnchor?.exclusionPrinciple
          ? `Exclusion: ${roadmap.authorityAnchor.exclusionPrinciple}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  blocks.forEach((block) => {
    if (!block.value || y > PAGE_H - 40) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(STONE.r, STONE.g, STONE.b);
    doc.text(block.label, MARGIN, y);
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(INK.r, INK.g, INK.b);
    const lines = wrapText(doc, block.value, PAGE_W - MARGIN * 2);
    doc.text(lines.slice(0, 8), MARGIN, y + 8);
    y += 16 + lines.slice(0, 8).length * 5.5;
    drawHairline(doc, y - 4);
    y += 8;
  });
  drawFooter(doc, "roadmap");
}

function drawDebris(doc: jsPDF, metadata: ZineMetadata): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(STONE.r, STONE.g, STONE.b);
  doc.text("FIELD DEBRIS", MARGIN, MARGIN + 4);
  drawHairline(doc, MARGIN + 8);

  const debris = metadata.originalInput || metadata.content.meta?.intent || "Debris data obscured.";
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(wrapText(doc, debris, PAGE_W - MARGIN * 2).slice(0, 40), MARGIN, MARGIN + 24);
  drawFooter(doc, "debris");
}

/** Summarize pages for export manifests (no geometry). */
export function summarizePagesForExport(metadata: ZineMetadata): StructuredPdfPageSummary[] {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  return (hydrated.content.pages || []).map((page, i) => ({
    pageNumber: page.pageNumber ?? i + 1,
    headline: page.headline || `Plate ${i + 1}`,
    hasCustomLayout: pageHasCustomLayout(page),
    imageUrl: exportAssetUrl(page),
  }));
}

/**
 * Build an A4 PDF from zine metadata (text + images) without DOM rasterization.
 * Uses standard PDF fonts (Times/Helvetica) — brand web fonts stay in the reader.
 */
export async function buildStructuredZinePdf(
  metadata: ZineMetadata,
  options: StructuredPdfOptions = {},
): Promise<jsPDF> {
  const hydrated = hydrateLegacyZineMetadata(metadata);
  const sections = asSectionSet(options.sections);
  const includeCustomLayouts = options.includeCustomLayouts !== false;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  let pageIndex = 0;
  let started = false;

  const beginPage = () => {
    if (started) {
      pageIndex = ensurePage(doc, pageIndex + 1);
    } else {
      started = true;
    }
  };

  if (sections.has("cover")) {
    beginPage();
    const coverUrl = await resolveZineExportCoverUrl(hydrated);
    const cover = await fetchImageForPdf(coverUrl || undefined);
    drawCover(doc, hydrated, cover);
  }

  if (sections.has("reading")) {
    beginPage();
    drawReading(doc, hydrated);
  }

  if (sections.has("signals") && (hydrated.content.semiotic_signals?.length || 0) > 0) {
    beginPage();
    drawSignals(doc, hydrated);
  }

  if (sections.has("plates") && hydrated.content.pages?.length) {
    for (let i = 0; i < hydrated.content.pages.length; i++) {
      const page = hydrated.content.pages[i];
      beginPage();
      if (includeCustomLayouts && pageHasCustomLayout(page)) {
        const imageMap = new Map<string, { dataUrl: string; format: "JPEG" | "PNG" }>();
        const urls = new Set<string>();
        const pageImageUrl = exportAssetUrl(page);
        if (pageImageUrl) urls.add(pageImageUrl);
        if (page.image_url) urls.add(page.image_url);
        page.customLayout?.elements.forEach((el) => {
          if (el.type === "image" && el.content) urls.add(el.content);
        });
        await Promise.all(
          [...urls].map(async (url) => {
            const img = await fetchImageForPdf(url);
            if (img) imageMap.set(url, img);
          }),
        );
        drawComposedPlate(doc, page, i, imageMap);
      } else {
        const img = await fetchImageForPdf(exportAssetUrl(page));
        drawDefaultPlate(doc, page, i, img);
      }
    }
  }

  if (sections.has("roadmap") && (hydrated.content.roadmap || hydrated.content.the_roadmap)) {
    beginPage();
    drawRoadmap(doc, hydrated);
  }

  if (
    sections.has("debris") &&
    (hydrated.originalInput || hydrated.content.meta?.intent)
  ) {
    beginPage();
    drawDebris(doc, hydrated);
  }

  if (!started) {
    // Empty selection — still emit a cover stub so download is never blank.
    drawCover(doc, hydrated, null);
  }

  return doc;
}

export async function downloadStructuredZinePdf(
  metadata: ZineMetadata,
  options: StructuredPdfOptions = {},
): Promise<void> {
  const doc = await buildStructuredZinePdf(metadata, options);
  doc.save(`Mimi_${safeFilename(metadata.title)}.pdf`);
}
