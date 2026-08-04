import React from "react";
import { BarChart3, Radio } from "lucide-react";
import type { ZineMetadata } from "../../types";
import type { MetricProvenance } from "../../lib/publisher/types";

interface PerformanceMetric {
  label: string;
  value: string;
  provenance: MetricProvenance;
  note?: string;
}

function ProvenanceTag({ provenance }: { provenance: MetricProvenance }) {
  const labels: Record<MetricProvenance, string> = {
    live: "Live",
    derived: "Derived",
    estimated: "Estimated",
    sample: "Sample",
    "awaiting-connection": "Not connected",
  };
  const colors: Record<MetricProvenance, string> = {
    live: "text-emerald-400",
    derived: "text-sky-400",
    estimated: "text-amber-400",
    sample: "text-stone-500",
    "awaiting-connection": "text-stone-600",
  };
  return (
    <span className={`font-mono text-[7px] uppercase tracking-wider ${colors[provenance]}`}>
      {labels[provenance]}
    </span>
  );
}

export const PerformancePanel: React.FC<{
  artifacts: ZineMetadata[];
}> = ({ artifacts }) => {
  const publicCount = artifacts.filter((z) => z.isPublic).length;
  const latestPublish = artifacts
    .filter((z) => z.publishedAt)
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))[0];

  const derivedMetrics: PerformanceMetric[] = [
    {
      label: "Public issues",
      value: String(publicCount),
      provenance: "derived",
      note: "From your artifact library",
    },
    {
      label: "Latest publication",
      value: latestPublish?.publishedAt
        ? new Date(latestPublish.publishedAt).toLocaleDateString()
        : "—",
      provenance: latestPublish ? "derived" : "awaiting-connection",
      note: latestPublish?.title || "No published issues",
    },
  ];

  const awaitingMetrics: PerformanceMetric[] = [
    { label: "Issue opens", value: "—", provenance: "awaiting-connection" },
    { label: "Completed reads", value: "—", provenance: "awaiting-connection" },
    { label: "Saves", value: "—", provenance: "awaiting-connection" },
    { label: "Keep Tabs subscriptions", value: "—", provenance: "awaiting-connection" },
    { label: "Shares", value: "—", provenance: "awaiting-connection" },
    { label: "Referral sources", value: "—", provenance: "awaiting-connection" },
    { label: "Returning readers", value: "—", provenance: "awaiting-connection" },
    { label: "Product clicks", value: "—", provenance: "awaiting-connection" },
    { label: "Issue-to-product conversion", value: "—", provenance: "awaiting-connection" },
    { label: "Email delivery", value: "—", provenance: "awaiting-connection" },
    { label: "Sponsor revenue", value: "—", provenance: "awaiting-connection" },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-900 border border-stone-800 text-stone-400 rounded-sm">
          <BarChart3 size={10} />
          <span className="text-[9px] uppercase tracking-widest font-black">Performance</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-white">After publication</h2>
        <p className="font-sans text-sm text-stone-500 max-w-xl">
          Post-release metrics appear here when an analytics provider or event pipeline is
          connected. Derived counts from your library are labeled explicitly.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {derivedMetrics.map((m) => (
          <div key={m.label} className="border border-stone-850 bg-[#121112] p-4">
            <div className="flex justify-between items-start gap-2">
              <span className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
                {m.label}
              </span>
              <ProvenanceTag provenance={m.provenance} />
            </div>
            <p className="font-serif text-2xl text-white mt-2">{m.value}</p>
            {m.note && (
              <p className="font-sans text-[10px] text-stone-600 mt-1">{m.note}</p>
            )}
          </div>
        ))}
      </section>

      <section className="border border-stone-850 bg-[#121112] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-stone-500" />
          <h3 className="font-serif text-lg font-bold text-white">Reader & commerce analytics</h3>
        </div>
        <p className="font-sans text-sm text-stone-500">
          No analytics provider connected. Issue opens, reads, shares, and sponsor performance
          require a live event source.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {awaitingMetrics.map((m) => (
            <div key={m.label} className="border border-stone-900 p-3">
              <div className="flex justify-between gap-2">
                <span className="font-mono text-[7px] uppercase tracking-wider text-stone-600">
                  {m.label}
                </span>
                <ProvenanceTag provenance={m.provenance} />
              </div>
              <p className="font-mono text-sm text-stone-700 mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const SponsorPanel: React.FC = () => (
  <section className="border border-stone-850 bg-[#121112] p-6 space-y-4">
    <h3 className="font-serif text-lg font-bold text-white">Sponsorship operations</h3>
    <p className="font-sans text-sm text-stone-500 leading-relaxed">
      No sponsor program configured. When sponsorship is enabled, this desk will track sponsor,
      issue placement, creative asset, disclosure, contract state, approval, publish date, and
      performance — with approval opening the exact placement being reviewed.
    </p>
    <p className="font-mono text-[8px] uppercase tracking-wider text-stone-600">
      Sample sponsor rows removed — no fictional revenue shown.
    </p>
  </section>
);

export const DeliverabilityPanel: React.FC = () => (
  <section className="border border-stone-850 bg-[#121112] p-6 space-y-4">
    <h3 className="font-serif text-lg font-bold text-white">Email delivery</h3>
    <p className="font-sans text-sm text-stone-500 leading-relaxed">
      SPF, DKIM, DMARC, and complaint rates are not verified by Mimi until a mail provider
      integration or server-side DNS check is connected.
    </p>
    <div className="border border-stone-800 bg-stone-950 p-4 space-y-3">
      {["SPF", "DKIM", "DMARC", "Complaint rate"].map((label) => (
        <div key={label} className="flex justify-between items-center gap-2">
          <span className="font-mono text-[8px] uppercase tracking-wider text-stone-500">
            {label}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-wider text-stone-600">
            Not checked
          </span>
        </div>
      ))}
    </div>
    <p className="font-sans text-[11px] text-stone-600 italic">
      Public issues distribute via Keep Tabs RSS when made public — not via verified bulk email.
    </p>
  </section>
);
