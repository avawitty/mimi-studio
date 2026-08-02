/**
 * Shadow-memory embedding index helpers.
 * Detects legacy / cross-provider width + model mismatches and selects docs to re-embed.
 */

export type ShadowMemoryDoc = {
  id: string;
  kind?: string;
  embedding_field?: number[] | null;
  embedding_dims?: number | null;
  embedding_model?: string | null;
  content_preview?: string | null;
  /** Full text used at last embed (preferred for reindex). */
  embed_text?: string | null;
  type?: string | null;
  synced_at?: number | null;
  reindexed_at?: number | null;
};

export type ShadowEmbeddingAudit = {
  total: number;
  shadowDocs: number;
  withVector: number;
  missingVector: number;
  searchable: number;
  incompatible: number;
  /** Docs that need rewrite and have embeddable text (actionable CTA). */
  reindexable: number;
  referenceDims: number | null;
  referenceModel: string | null;
  widthHistogram: Record<string, number>;
  needsReindex: boolean;
};

export function textForShadowEmbed(doc: Pick<ShadowMemoryDoc, "embed_text" | "content_preview">): string {
  const full = (doc.embed_text || "").trim();
  if (full) return full.slice(0, 2000);
  return (doc.content_preview || "").trim().slice(0, 2000);
}

export function isShadowEmbeddingDoc(doc: ShadowMemoryDoc): boolean {
  if (doc.kind === "embedding_shadow") return true;
  // Legacy docs may omit kind but still carry embedding_field / content_preview.
  return Array.isArray(doc.embedding_field) || Boolean(textForShadowEmbed(doc));
}

function docNeedsRewrite(
  doc: ShadowMemoryDoc,
  referenceDims: number | null,
  referenceModel: string | null,
): { missing: boolean; incompatible: boolean; broken: boolean } {
  const dims = doc.embedding_field?.length || 0;
  const missing = !dims;
  const widthMismatch = Boolean(referenceDims != null && dims > 0 && dims !== referenceDims);
  const docModel = String(doc.embedding_model || "").trim();
  const modelMismatch = Boolean(referenceModel && docModel && docModel !== referenceModel);
  const incompatible = widthMismatch || modelMismatch;
  return { missing, incompatible, broken: missing || incompatible };
}

/**
 * Audit shadow docs against a query vector width/model (or majority width when unset).
 */
export function auditShadowEmbeddings(
  docs: ShadowMemoryDoc[],
  referenceDims?: number | null,
  referenceModel?: string | null,
): ShadowEmbeddingAudit {
  const shadowDocs = docs.filter(isShadowEmbeddingDoc);
  const widthHistogram: Record<string, number> = {};
  let withVector = 0;
  let missingVector = 0;
  const refModel = String(referenceModel || "").trim() || null;

  for (const doc of shadowDocs) {
    const dims = doc.embedding_field?.length || 0;
    if (dims > 0) {
      withVector += 1;
      const key = String(dims);
      widthHistogram[key] = (widthHistogram[key] || 0) + 1;
    } else {
      missingVector += 1;
    }
  }

  let resolvedRef = referenceDims && referenceDims > 0 ? referenceDims : null;
  if (resolvedRef == null) {
    let bestDims = 0;
    let bestCount = 0;
    for (const [dims, count] of Object.entries(widthHistogram)) {
      if (count > bestCount) {
        bestCount = count;
        bestDims = Number(dims);
      }
    }
    resolvedRef = bestDims > 0 ? bestDims : null;
  }

  let searchable = 0;
  let incompatible = 0;
  let reindexable = 0;
  for (const doc of shadowDocs) {
    const { missing, incompatible: incompat, broken } = docNeedsRewrite(doc, resolvedRef, refModel);
    if (!missing && !incompat) searchable += 1;
    else if (incompat) incompatible += 1;
    // needsReindex only when a broken doc can actually be rewritten
    if (broken && textForShadowEmbed(doc)) reindexable += 1;
  }

  return {
    total: docs.length,
    shadowDocs: shadowDocs.length,
    withVector,
    missingVector,
    searchable,
    incompatible,
    reindexable,
    referenceDims: resolvedRef,
    referenceModel: refModel,
    widthHistogram,
    needsReindex: reindexable > 0,
  };
}

/** Docs that should be rewritten into the current embedding space. */
export function selectDocsForReindex(
  docs: ShadowMemoryDoc[],
  referenceDims?: number | null,
  referenceModel?: string | null,
): ShadowMemoryDoc[] {
  const audit = auditShadowEmbeddings(docs, referenceDims, referenceModel);
  const targetDims = audit.referenceDims;
  const targetModel = audit.referenceModel;
  return docs.filter((doc) => {
    if (!isShadowEmbeddingDoc(doc)) return false;
    if (!textForShadowEmbed(doc)) return false;
    const { broken } = docNeedsRewrite(doc, targetDims, targetModel);
    return broken;
  });
}
