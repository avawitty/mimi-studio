import type {
  EmbeddingPoint,
  TasteCorpusExplorerItem,
  TasteCorpusIndexItem,
} from "./types";

export function joinCorpusPoints(
  points: EmbeddingPoint[],
  indexItems: TasteCorpusIndexItem[],
): TasteCorpusExplorerItem[] {
  const byId = new Map(indexItems.map((item) => [item.id, item]));

  return points
    .map((point) => {
      const meta = byId.get(point.id);
      if (!meta) return null;
      return {
        ...point,
        title: meta.title,
        href: meta.href,
      };
    })
    .filter((item): item is TasteCorpusExplorerItem => item != null);
}
