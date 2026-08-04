import { useEffect, useMemo, useState } from "react";
import type {
  EmbeddingsArtifact,
  TasteCorpusExplorerItem,
  TasteCorpusIndex,
} from "../../lib/taste-corpus/types";
import { joinCorpusPoints } from "../../lib/taste-corpus/joinCorpusPoints";
import { CorpusCrawlList } from "./CorpusCrawlList";
import { EmbeddingViewport } from "./EmbeddingViewport";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: TasteCorpusExplorerItem[]; meta: EmbeddingsArtifact["meta"] };

export function TasteCorpusExplorer() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [embeddingsRes, indexRes] = await Promise.all([
          fetch("/data/embeddings.json"),
          fetch("/data/taste-corpus-index.json"),
        ]);

        if (!embeddingsRes.ok || !indexRes.ok) {
          throw new Error("Could not load corpus map data.");
        }

        const embeddings = (await embeddingsRes.json()) as EmbeddingsArtifact;
        const index = (await indexRes.json()) as TasteCorpusIndex;
        const items = joinCorpusPoints(embeddings.points, index.items);

        if (!cancelled) {
          if (!items.length) {
            setLoadState({
              status: "error",
              message: "No specimens indexed yet.",
            });
            return;
          }
          setLoadState({
            status: "ready",
            items,
            meta: embeddings.meta,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Could not load corpus map.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const indexItems = useMemo(() => {
    if (loadState.status !== "ready") return [];
    return loadState.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
    }));
  }, [loadState]);

  return (
    <div className="min-h-dvh bg-mimi-field text-mimi-ink">
      <header className="border-b border-mimi-hairline px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-mimi-stone">
              Mimi Studio
            </p>
            <h1 className="font-display text-3xl leading-tight text-mimi-ink sm:text-4xl">
              Taste Corpus
            </h1>
            <p className="mt-2 max-w-xl font-sans text-sm text-mimi-stone">
              A two-dimensional map of visual taste specimens — CLIP embeddings
              projected offline. Pan, zoom, hover to preview, click to open.
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 font-sans text-xs uppercase tracking-widest text-mimi-olive underline-offset-2 hover:underline"
          >
            Home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {loadState.status === "loading" ? (
          <p className="font-sans text-sm text-mimi-stone">Loading corpus map…</p>
        ) : null}

        {loadState.status === "error" ? (
          <div
            className="border border-mimi-hairline bg-mimi-worktable px-4 py-6"
            role="alert"
          >
            <p className="font-sans text-sm text-mimi-ink">{loadState.message}</p>
            <p className="mt-2 font-sans text-xs text-mimi-stone">
              Run <code className="text-mimi-ink">npm run corpus:embed</code> to
              generate projection artifacts.
            </p>
          </div>
        ) : null}

        {loadState.status === "ready" ? (
          <>
            <p className="mb-4 font-sans text-[10px] uppercase tracking-widest text-mimi-stone">
              {loadState.meta.count} points · {loadState.meta.model} · UMAP
              n={loadState.meta.umap.n_neighbors}
            </p>
            <EmbeddingViewport items={loadState.items} />
            <p className="mt-4 font-sans text-xs text-mimi-stone">
              Demonstration seed corpus — specimens link to the public showcase.
            </p>
          </>
        ) : null}

        <CorpusCrawlList items={indexItems} />
      </main>
    </div>
  );
}
