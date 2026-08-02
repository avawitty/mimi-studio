/**
 * Shadow-memory embedding index helpers.
 * Detects legacy / cross-provider width mismatches and selects docs to re-embed.
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
};

export type ShadowEmbeddingAudit = {
  total: number;
  shadowDocs: number;
  withVector: number;
  missingVector: number;
  searchable: number;
  incompatible: number;
  reindexable: number;
  referenceDims: number | null;
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

/**
 * Audit shadow docs against a query vector width (or majority width when unset).
 */
export function auditShadowEmbeddings(
  docs: ShadowMemoryDoc[],
  referenceDims?: number | null,
): ShadowEmbeddingAudit {
  const shadowDocs = docs.filter(isShadowEmbeddingDoc);
  const widthHistogram: Record<string, number> = {};
  let withVector = 0;
  let missingVector = 0;
  let reindexable = 0;

  for (const doc of shadowDocs) {
    const dims = doc.embedding_field?.length || 0;
    if (dims > 0) {
      withVector += 1;
      const key = String(dims);
      widthHistogram[key] = (widthHistogram[key] || 0) + 1;
    } else {
      missingVector += 1;
    }
    if (textForShadowEmbed(doc)) reindexable += 1;
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
  for (const doc of shadowDocs) {
    const dims = doc.embedding_field?.length || 0;
    if (!dims) continue;
    if (resolvedRef == null || dims === resolvedRef) searchable += 1;
    else incompatible += 1;
  }

  const needsReindex =
    reindexable > 0 && (incompatible > 0 || missingVector > 0 || Object.keys(widthHistogram).length > 1);

  return {
    total: docs.length,
    shadowDocs: shadowDocs.length,
    withVector,
    missingVector,
    searchable,
    incompatible,
    reindexable,
    referenceDims: resolvedRef,
    widthHistogram,
    needsReindex,
  };
}

/** Docs that should be rewritten into the current embedding space. */
export function selectDocsForReindex(
  docs: ShadowMemoryDoc[],
  referenceDims?: number | null,
): ShadowMemoryDoc[] {
  const audit = auditShadowEmbeddings(docs, referenceDims);
  const targetDims = audit.referenceDims;
  return docs.filter((doc) => {
    if (!isShadowEmbeddingDoc(doc)) return false;
    if (!textForShadowEmbed(doc)) return false;
    const dims = doc.embedding_field?.length || 0;
    if (!dims) return true;
    if (targetDims != null && dims !== targetDims) return true;
    // Mixed-width corpus: rewrite minority widths even when no reference provided.
    if (Object.keys(audit.widthHistogram).length > 1 && targetDims != null && dims !== targetDims) {
      return true;
    }
    return false;
  });
}
