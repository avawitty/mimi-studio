export interface TasteCorpusManifestItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  href: string;
}

export interface TasteCorpusManifest {
  version: 1;
  items: TasteCorpusManifestItem[];
}

export interface EmbeddingPoint {
  id: string;
  x: number;
  y: number;
  thumbnailUrl: string;
}

export interface EmbeddingsArtifactMeta {
  model: string;
  umap: { n_neighbors: number; min_dist: number };
  coordSpace: "[-1,1]";
  generatedAt: string;
  count: number;
  manifestHash?: string;
}

export interface EmbeddingsArtifact {
  meta: EmbeddingsArtifactMeta;
  points: EmbeddingPoint[];
}

export interface TasteCorpusIndexItem {
  id: string;
  title: string;
  href: string;
}

export interface TasteCorpusIndex {
  version: 1;
  items: TasteCorpusIndexItem[];
}

export interface TasteCorpusExplorerItem extends EmbeddingPoint {
  title: string;
  href: string;
}
