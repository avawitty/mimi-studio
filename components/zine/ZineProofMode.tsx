import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  buildZineProofDiagnostics,
  summarizeZineProof,
} from "../../lib/zine/zineProofDiagnostics";
import { buildZineProofSequence } from "../../lib/zine/zineIssuePlanner";
import { fullFidelityPageIndexes } from "../../lib/zine/zinePerformance";
import type { MimiZineArtifact } from "../../types";
import { ZinePageRenderer } from "./ZinePageRenderer";

interface ZineProofModeProps {
  artifact: MimiZineArtifact;
  onClose: () => void;
  onApprove?: () => void;
}

export function ZineProofMode({
  artifact,
  onClose,
  onApprove,
}: ZineProofModeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true);
  const proofPages = useMemo(
    () => buildZineProofSequence(artifact),
    [artifact],
  );
  const diagnostics = useMemo(
    () => buildZineProofDiagnostics(artifact, proofPages),
    [artifact, proofPages],
  );
  const summary = useMemo(
    () => summarizeZineProof(diagnostics),
    [diagnostics],
  );
  const fullFidelityIndexes = useMemo(
    () => fullFidelityPageIndexes(activeIndex, proofPages.length),
    [activeIndex, proofPages.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === "ArrowRight") {
        if (proofPages.length === 0) return;
        setActiveIndex((index) =>
          Math.min(proofPages.length - 1, index + 1),
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [proofPages.length, onClose]);

  const activePage = proofPages[activeIndex];

  return (
    <div
      className="fixed inset-0 z-[26000] flex flex-col bg-[#efefec] text-[var(--mimi-ink,#0a0a0a)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Proof ${artifact.identity.title}`}
      data-zine-proof-mode
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--mimi-hairline,#d4d4d4)] bg-white px-4 md:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg italic">
            {artifact.identity.title}
          </p>
          <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
            Proof / revision {String(artifact.revision).padStart(2, "0")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDiagnosticsOpen((open) => !open)}
            className="min-h-11 border border-[var(--mimi-hairline,#d4d4d4)] px-3 font-mono text-[8px] uppercase tracking-[0.18em]"
            aria-expanded={diagnosticsOpen}
          >
            {summary.blocking > 0
              ? `${summary.blocking} blocking`
              : `${summary.warnings} warnings`}
          </button>
          {onApprove ? (
            <button
              type="button"
              onClick={onApprove}
              disabled={!summary.canApprove}
              className="min-h-11 bg-[var(--mimi-ink,#0a0a0a)] px-4 font-mono text-[8px] uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="inline-flex items-center gap-2">
                <Check size={13} /> Approve proof
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center border border-[var(--mimi-hairline,#d4d4d4)]"
            aria-label="Close proof"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-8">
          {activePage ? (
            <div className="relative h-full max-h-[calc(100dvh-10rem)] w-full max-w-[min(72vw,70vh)]">
              {[...fullFidelityIndexes].map((index) => {
                const page = proofPages[index];
                const active = index === activeIndex;
                return (
                  <div
                    key={page.id || `${page.pageNumber}-${index}`}
                    className={`absolute inset-0 flex items-center justify-center transition-opacity motion-reduce:transition-none ${
                      active
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                    aria-hidden={!active}
                  >
                    <ZinePageRenderer
                      artifact={artifact}
                      page={page}
                      pageIndex={index}
                      className="max-h-full w-full shadow-[0_12px_45px_rgba(10,10,10,0.16)]"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-[var(--mimi-hairline,#d4d4d4)] bg-white p-12 text-center">
              <AlertTriangle size={22} className="mx-auto text-[#a33a2b]" />
              <p className="mt-4 font-serif text-lg italic">
                This issue has no drafted pages.
              </p>
            </div>
          )}

          {proofPages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                disabled={activeIndex === 0}
                className="absolute left-3 flex min-h-11 min-w-11 items-center justify-center border border-[var(--mimi-hairline,#d4d4d4)] bg-white disabled:opacity-25 md:left-6"
                aria-label="Previous proof page"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((index) =>
                    Math.min(proofPages.length - 1, index + 1),
                  )
                }
                disabled={activeIndex === proofPages.length - 1}
                className="absolute right-3 flex min-h-11 min-w-11 items-center justify-center border border-[var(--mimi-hairline,#d4d4d4)] bg-white disabled:opacity-25 md:right-6"
                aria-label="Next proof page"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
        </main>

        {diagnosticsOpen ? (
          <aside className="absolute inset-x-0 bottom-0 z-10 max-h-[44dvh] overflow-y-auto border-t border-[var(--mimi-hairline,#d4d4d4)] bg-white p-4 md:static md:w-80 md:max-h-none md:border-l md:border-t-0 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} />
                <h2 className="font-mono text-[8px] uppercase tracking-[0.24em]">
                  Proof diagnostics
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDiagnosticsOpen(false)}
                className="min-h-10 min-w-10 md:hidden"
                aria-label="Close diagnostics"
              >
                <X size={15} />
              </button>
            </div>

            {diagnostics.length > 0 ? (
              <ul className="space-y-2">
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.id}-${diagnostic.pageId || index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!diagnostic.pageId) return;
                        const pageIndex = proofPages.findIndex(
                          (page) => page.id === diagnostic.pageId,
                        );
                        if (pageIndex >= 0) setActiveIndex(pageIndex);
                      }}
                      className="w-full border border-[var(--mimi-hairline,#d4d4d4)] p-3 text-left"
                    >
                      <span
                        className={`font-mono text-[7px] uppercase tracking-[0.2em] ${
                          diagnostic.severity === "blocking"
                            ? "text-[#a33a2b]"
                            : "text-[var(--mimi-stone,#78716c)]"
                        }`}
                      >
                        {diagnostic.severity} / {diagnostic.id.replaceAll("-", " ")}
                      </span>
                      <span className="mt-2 block font-serif text-sm italic leading-snug">
                        {diagnostic.message}
                      </span>
                      <span className="mt-2 block font-sans text-[9px] leading-relaxed text-[var(--mimi-stone,#78716c)]">
                        {diagnostic.correction}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-[var(--mimi-hairline,#d4d4d4)] p-4">
                <p className="font-serif text-sm italic">
                  No proof issues detected.
                </p>
              </div>
            )}
          </aside>
        ) : null}
      </div>

      <nav
        className="flex h-20 shrink-0 items-center gap-2 overflow-x-auto border-t border-[var(--mimi-hairline,#d4d4d4)] bg-white px-4"
        aria-label="Proof pages"
      >
        {proofPages.map((page, index) => (
          <button
            key={page.id || `${page.pageNumber}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`min-h-11 min-w-11 border px-3 font-mono text-[8px] ${
              index === activeIndex
                ? "border-[var(--mimi-ink,#0a0a0a)] bg-[var(--mimi-ink,#0a0a0a)] text-white"
                : "border-[var(--mimi-hairline,#d4d4d4)] bg-white"
            }`}
            aria-current={index === activeIndex ? "page" : undefined}
            aria-label={`Open page ${page.pageNumber}: ${page.headline}`}
          >
            {String(page.pageNumber).padStart(2, "0")}
          </button>
        ))}
      </nav>
    </div>
  );
}
