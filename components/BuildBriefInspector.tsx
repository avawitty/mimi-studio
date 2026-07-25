import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ResearchContextPacket, ScryFinding } from "../types";
import { listResearchContexts } from "../services/researchContextService";
import { listScryFindings } from "../services/scrySessionService";

interface BuildBriefInspectorProps {
  userId: string;
  onClose: () => void;
}

export const BuildBriefInspector: React.FC<BuildBriefInspectorProps> = ({
  userId,
  onClose,
}) => {
  const [packets, setPackets] = useState<ResearchContextPacket[]>([]);
  const [findings, setFindings] = useState<ScryFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      const approved = listResearchContexts(userId).filter(
        (packet) =>
          packet.approvalState === "approved" &&
          packet.target === "build-brief",
      );
      const availableFindings = await listScryFindings(userId);
      if (!active) return;
      setPackets(approved);
      setFindings(availableFindings);
      setIsLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  const findingsById = useMemo(
    () => new Map(findings.map((finding) => [finding.id, finding])),
    [findings],
  );
  const evidenceCount = packets.reduce(
    (total, packet) => total + packet.selectedFindingIds.length,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[26000] overflow-y-auto bg-[#11110F]/88 p-4 backdrop-blur-xl md:p-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-brief-inspector-title"
    >
      <div className="mx-auto min-h-full max-w-5xl border border-[#D9D5C8] bg-[#F7F4EA] text-[#1A1A18] shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[#D9D5C8] bg-[#F7F4EA]/95 px-6 py-5 backdrop-blur md:px-10">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-[#8A5A34]">
              Mimi // Used Context
            </p>
            <h2
              id="build-brief-inspector-title"
              className="mt-2 font-serif text-3xl italic md:text-4xl"
            >
              Build Brief Inputs
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#6C685F]">
              Only creator-approved Research Context packets appear here. This
              is the exact Scry evidence available to Build Brief compilation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#D9D5C8] p-2 text-[#6C685F] transition-colors hover:bg-white hover:text-black"
            aria-label="Close Build Brief inputs"
          >
            <X size={18} />
          </button>
        </header>

        <main className="space-y-8 px-6 py-8 md:px-10">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Approved packets", packets.length],
              ["Evidence findings", evidenceCount],
              ["Embeddings passed", 0],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#D9D5C8] bg-white/55 p-4">
                <div className="font-serif text-3xl italic">{value}</div>
                <div className="mt-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#777269]">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-[#777269]">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]">
                Inspecting approved context
              </span>
            </div>
          ) : packets.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#C9C4B6] px-6 text-center">
              <FileSearch size={28} strokeWidth={1.2} />
              <h3 className="mt-4 font-serif text-2xl italic">
                No approved research yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#777269]">
                Save evidence in Scry, create a draft Research Context, then
                approve it to make it selectable by Build Brief.
              </p>
            </div>
          ) : (
            packets.map((packet, packetIndex) => {
              const packetFindings = packet.selectedFindingIds
                .map((id) => findingsById.get(id))
                .filter((finding): finding is ScryFinding => Boolean(finding));
              return (
                <section
                  key={packet.id}
                  className="border border-[#CFCABC] bg-white/70"
                >
                  <div className="border-b border-[#D9D5C8] p-5 md:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#8A5A34]">
                        Packet {String(packetIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        <CheckCircle2 size={12} /> Creator approved
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-2xl italic">
                      {packet.title}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {packet.tags.map((tag) => (
                        <span
                          key={tag}
                          className="border border-[#D9D5C8] bg-[#F7F4EA] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-[#6C685F]"
                        >
                          {tag.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[8px] uppercase tracking-[0.13em] text-[#8B867D]">
                      <span>{packetFindings.length} resolved findings</span>
                      <span>Integrity {packet.integrityHash}</span>
                      <span>Target {packet.target}</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E3DED2]">
                    {packetFindings.map((finding) => (
                      <article key={finding.id} className="p-5 md:p-7">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em]">
                          <span
                            className={
                              finding.resultKind === "world"
                                ? "text-blue-700"
                                : "text-[#8A5A34]"
                            }
                          >
                            {finding.resultKind === "world"
                              ? "World"
                              : "Creator history"}
                          </span>
                          <span className="text-[#A09A8E]">/</span>
                          <span className="text-[#777269]">
                            {finding.sourceType.replaceAll("_", " ")}
                          </span>
                          <span className="text-[#A09A8E]">/</span>
                          <span className="text-[#777269]">
                            {finding.provider}
                          </span>
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-serif text-xl">
                              {finding.title}
                            </h4>
                            {finding.snippet && (
                              <p className="mt-2 max-w-3xl font-serif text-sm leading-relaxed text-[#5F5B53]">
                                {finding.snippet}
                              </p>
                            )}
                          </div>
                          {finding.url && (
                            <a
                              href={finding.url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-[#777269] hover:text-black"
                              aria-label={`Open source for ${finding.title}`}
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                        <dl className="mt-5 grid gap-3 border-l border-[#D9D5C8] pl-4 text-xs text-[#6C685F] md:grid-cols-2">
                          <div>
                            <dt className="font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-[#989287]">
                              Search motif
                            </dt>
                            <dd className="mt-1 font-serif italic">
                              {finding.query}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-[#989287]">
                              Originating zine
                            </dt>
                            <dd className="mt-1 font-serif italic">
                              {finding.origin.artifactTitle ||
                                finding.origin.artifactId ||
                                "Manual Scry"}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {finding.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-[#EEEADF] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[#6C685F]"
                            >
                              {tag.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                    {packetFindings.length === 0 && (
                      <div className="p-6 text-sm text-[#777269]">
                        The packet is approved, but its evidence objects are not
                        cached on this device.
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}

          <div className="flex items-start gap-3 border-t border-[#D9D5C8] pt-6 text-xs leading-relaxed text-[#777269]">
            <ShieldCheck size={18} className="shrink-0 text-emerald-700" />
            <p>
              Build Brief receives exact snippets, URLs, tags, provider labels,
              and provenance. Scry embeddings are deliberately excluded from
              this handoff.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};
