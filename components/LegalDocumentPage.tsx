import React from "react";
import { ArrowRight, Lock, QrCode } from "lucide-react";
import {
  getLegalDocument,
  LegalDocumentType,
} from "../lib/legalContent";

interface LegalDocumentPageProps {
  type: LegalDocumentType;
}

export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
  type,
}) => {
  const doc = getLegalDocument(type);

  return (
    <div className="min-h-screen bg-[#18181A] flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden text-nous-base">
      <div className="absolute top-10 left-10 text-[#555] font-mono text-xs uppercase tracking-widest pointer-events-none hidden md:block">
        MIMI ZINE ARCHIVE
      </div>
      <div className="absolute top-10 right-10 text-[#555] font-mono text-xs text-right uppercase tracking-widest pointer-events-none hidden md:block">
        [ REF: REPOSITORY ]
        <br /> [ STATUS: ONLINE ]
      </div>

      <div className="absolute bottom-10 left-10 text-[#555] font-mono text-xs uppercase tracking-widest pointer-events-none hidden md:block">
        LAST UPDATED: {doc.lastUpdated.toUpperCase()}
        <br />
        DOMAIN: MIMI.YOU
      </div>
      <div className="absolute bottom-10 right-10 flex items-center gap-3 text-[#555] font-mono text-[10px] uppercase tracking-widest pointer-events-none hidden md:flex">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />{" "}
        LIVE CONNECTION
      </div>

      <div className="max-w-4xl w-full relative z-10 rotate-1 group transition-transform hover:rotate-0 duration-700 mt-8 md:mt-0">
        <div className="absolute -inset-2 md:-inset-4 bg-[#dccca9] rounded-sm shadow-2xl -z-10 rotate-[-2deg] transition-transform group-hover:rotate-0 duration-700 border border-[#bfae8e]" />

        <div className="absolute -top-9 left-2 md:left-8 bg-[#fdfdfb] border border-[#e5e5e5] px-4 py-2 shadow-sm font-mono text-[10px] font-bold tracking-widest uppercase z-10 text-black">
          CONFIDENTIAL
        </div>

        <div className="absolute top-16 -left-4 md:-left-12 bg-[#f4f2e9] border border-[#e5e0cf] shadow-[2px_4px_10px_rgba(0,0,0,0.1)] p-4 w-36 rotate-[-5deg] z-20 font-mono text-[8px] text-[#4a473f] leading-relaxed mix-blend-multiply opacity-95 overflow-hidden transition-transform group-hover:-rotate-[2deg] duration-500">
          <div className="absolute top-0 right-0 p-1 opacity-20">
            <Lock size={12} />
          </div>
          <div className="border-b border-[#4a473f]/20 pb-1 mb-1 font-bold uppercase">
            System Note
          </div>
          Legal record.
          <br />
          Read carefully.
          <br />
          Contact: {doc.contactEmail}
          <div className="w-4 h-4 rounded-full border border-red-500/50 absolute bottom-2 right-2" />
        </div>

        <div className="bg-[#fdfdfb] p-8 md:p-16 shadow-[0_10px_50px_rgba(0,0,0,0.3)] relative border-l-4 border-l-[#e4dfd5] text-[#222]">
          <div className="absolute top-8 right-8 border border-black/20 p-2 font-mono flex-col justify-between hidden sm:flex w-48 bg-white/50 backdrop-blur-sm">
            <div className="flex justify-between gap-8 border-b border-black/10 pb-1 mb-1 items-center">
              <span className="text-[7px] font-bold uppercase tracking-widest text-[#222]">
                ARCHIVE ID
              </span>
              <span className="text-[8px] uppercase tracking-widest text-[#555]">
                LEG-{type === "privacy" ? "PRV" : "TOS"}
              </span>
            </div>
            <div className="font-serif italic text-sm text-black py-1">
              FILE: {doc.subtitle.toUpperCase()}
            </div>
            <div className="flex justify-between items-end mt-2 pt-1 border-t border-black/10">
              <span className="text-[7px] text-[#777] uppercase tracking-tight">
                {doc.lastUpdated}
              </span>
              <QrCode size={12} className="opacity-80 text-black" />
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl italic mb-3 text-black max-w-[70%]">
            {doc.title}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#666] mb-10">
            {doc.subtitle} · mimi.you
          </p>

          <div className="font-sans text-[#333] text-sm md:text-base leading-relaxed mb-8 flex flex-col gap-8 max-w-2xl relative">
            <div className="hidden md:block absolute -left-6 top-0 bottom-0 w-px bg-black/10" />

            {doc.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500"
              >
                <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#555] mb-3">
                  {String(index + 1).padStart(2, "0")} — {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.split("\n\n").map((paragraph, i) => (
                    <p
                      key={i}
                      className={
                        index === 0
                          ? "font-medium"
                          : "text-[#333] leading-relaxed"
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-end mt-16 pt-8 border-t border-black/10 gap-6">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#555] leading-tight">
              END OF RECORD.
              <br />
              QUESTIONS: {doc.contactEmail}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {type === "privacy" ? (
                <a
                  href="/terms"
                  className="font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-6 py-3 hover:bg-black/5 transition-colors text-center"
                >
                  Terms of Service
                </a>
              ) : (
                <a
                  href="/privacy"
                  className="font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-6 py-3 hover:bg-black/5 transition-colors text-center"
                >
                  Privacy Policy
                </a>
              )}
              <button
                onClick={() => (window.location.href = "/")}
                className="relative group/btn font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-8 py-3 hover:bg-black hover:text-white transition-colors overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Return to Vault <ArrowRight size={12} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-12 font-mono text-[9px] text-[#555] uppercase tracking-[0.3em] origin-right -rotate-90 pointer-events-none hidden xl:flex">
        <span className="opacity-100 mix-blend-difference">01 _READ</span>
        <span className="opacity-100 mix-blend-difference">02 _CONSENT</span>
        <span className="opacity-100 mix-blend-difference">03 _CREATE</span>
      </div>
    </div>
  );
};
