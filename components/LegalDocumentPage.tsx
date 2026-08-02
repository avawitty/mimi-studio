import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getLegalDocument,
  legalPathFor,
  LegalDocumentType,
} from "../lib/legalContent";

interface LegalDocumentPageProps {
  type: LegalDocumentType;
}

export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
  type,
}) => {
  const doc = getLegalDocument(type);
  const otherType: LegalDocumentType = type === "privacy" ? "terms" : "privacy";
  const otherDoc = getLegalDocument(otherType);

  return (
    <div className="min-h-screen bg-[#18181A] flex flex-col items-center px-4 py-10 md:px-8 md:py-16 relative overflow-hidden text-nous-base">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(220,204,169,0.12), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(220,204,169,0.08), transparent 45%)",
        }}
      />

      <div className="max-w-2xl w-full relative z-10">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-[#9a958a] hover:text-[#dccca9] transition-colors mb-8"
        >
          <ArrowLeft size={12} />
          Back to Mimi
        </a>

        <article className="bg-[#fdfdfb] text-[#222] shadow-[0_12px_48px_rgba(0,0,0,0.35)] border border-[#e4dfd5]">
          <header className="px-6 pt-8 pb-6 md:px-12 md:pt-12 md:pb-8 border-b border-black/8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#666] mb-3">
              Mimi · mimi.you
            </p>
            <h1 className="font-serif text-3xl md:text-5xl italic text-black tracking-tight mb-3">
              {doc.title}
            </h1>
            <p className="font-serif text-base md:text-lg text-[#555] leading-relaxed mb-4">
              {doc.subtitle}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Last updated · {doc.lastUpdated}
            </p>
          </header>

          <div className="px-6 py-8 md:px-12 md:py-10 flex flex-col gap-10">
            {doc.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#555] mb-3">
                  {String(index + 1).padStart(2, "0")} — {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.split("\n\n").map((paragraph, i) => (
                    <p
                      key={i}
                      className={
                        index === 0
                          ? "font-medium text-[#222] text-sm md:text-base leading-relaxed"
                          : "text-[#333] text-sm md:text-base leading-relaxed"
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="px-6 py-8 md:px-12 md:py-10 border-t border-black/8 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#666] leading-relaxed">
              Questions?
              <br />
              <a
                href={`mailto:${doc.contactEmail}`}
                className="text-black underline underline-offset-2 hover:opacity-70"
              >
                {doc.contactEmail}
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={legalPathFor(otherType)}
                className="font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-6 py-3 hover:bg-black/5 transition-colors text-center"
              >
                {otherDoc.title}
              </a>
              <a
                href="/"
                className="font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-8 py-3 hover:bg-black hover:text-white transition-colors text-center inline-flex items-center justify-center gap-3"
              >
                Return home <ArrowRight size={12} />
              </a>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
};
