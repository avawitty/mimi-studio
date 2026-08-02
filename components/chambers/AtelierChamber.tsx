import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pin, PinOff, Radar, RefreshCw, Search } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import {
  ATELIER_SOFT_CAP,
  confirmAtelierResonance,
  getAtelierCapacity,
  isAtelierObjectStale,
  listAtelierObjects,
  subscribeAtelierObjects,
  unpinAtelierObject,
  updateAtelierObjectIntent,
} from "../../services/atelierService";
import type { AtelierObject } from "../../types";
import { useUser } from "../../contexts/UserContext";

type FilterMode = "all" | "desire" | "reference" | "shopify" | "stale";

const intentLabel = (intent?: AtelierObject["intent"]): string => {
  switch (intent) {
    case "acquisition_signal":
      return "Acquisition signal";
    case "reference":
      return "Reference";
    case "desire":
      return "Desire signal";
    case undefined:
      return "Taste signal";
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
};

export const AtelierChamber: React.FC = () => {
  const { user } = useUser();
  const ownerUid = user?.uid;
  const [objects, setObjects] = useState<AtelierObject[]>(() =>
    listAtelierObjects(ownerUid),
  );
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const capacity = useMemo(() => getAtelierCapacity(ownerUid), [objects, ownerUid]);

  useEffect(() => {
    return subscribeAtelierObjects(setObjects, ownerUid);
  }, [ownerUid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return objects.filter((obj) => {
      if (filter === "shopify" && obj.commerce_source !== "shopify") return false;
      if (filter === "desire" && obj.intent === "reference") return false;
      if (filter === "reference" && obj.intent !== "reference") return false;
      if (filter === "stale" && !isAtelierObjectStale(obj)) return false;
      if (!q) return true;
      const haystack = [
        obj.motif,
        obj.vendor,
        obj.zineTitle,
        obj.semantic_trigger,
        obj.targeting_rationale,
        ...(obj.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [objects, filter, query]);

  const staleCount = objects.filter((obj) => isAtelierObjectStale(obj)).length;

  return (
    <ChamberShell
      moduleId="atelier"
      actions={
        <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-nous-subtle">
          {capacity.count}/{ATELIER_SOFT_CAP} signals
        </span>
      }
    >
      <div className="h-full overflow-y-auto bg-nous-base">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
          <div className="space-y-3 max-w-2xl">
            <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
              Objects you keep as taste evidence — desires and buyer orientation, not a shopping list.
            </p>
            <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
              Desire pins steer Studio and Tailor. Reference pins stay light cultural context.
              Soft cap {ATELIER_SOFT_CAP}: oldest reference pins prune first when full.
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-nous-subtle leading-relaxed">
              Thimble = sourcing · Pocket = media archive · Atelier = commerce-as-taste
            </p>
          </div>

          {(capacity.atCap || staleCount > 0) && (
            <div className="border border-nous-border bg-white px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                {capacity.atCap
                  ? `Archive at capacity (${ATELIER_SOFT_CAP}). New pins will release the oldest reference signals first.`
                  : `${staleCount} signal${staleCount === 1 ? "" : "s"} haven’t been confirmed in ~3 weeks.`}
              </p>
              {staleCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("stale")}
                  className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-text border-b border-current pb-0.5 self-start"
                >
                  Review stale
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-nous-subtle"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by motif, vendor, issue…"
                className="w-full bg-white border border-nous-border pl-9 pr-3 py-2.5 font-sans text-sm text-nous-text placeholder:text-nous-subtle/60 focus:outline-none focus:border-stone-400"
              />
            </div>
            <div className="flex items-center gap-1 border border-nous-border bg-white p-1 overflow-x-auto">
              {(
                [
                  ["all", "All"],
                  ["desire", "Desire"],
                  ["reference", "Reference"],
                  ["stale", "Stale"],
                  ["shopify", "Shopify"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1.5 font-sans text-[8px] uppercase tracking-widest font-black transition-colors shrink-0 ${
                    filter === mode
                      ? "bg-stone-900 text-white"
                      : "text-nous-subtle hover:text-nous-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-dashed border-nous-border bg-white/60 px-8 py-16 text-center space-y-4">
              <Radar size={28} className="mx-auto text-nous-subtle" strokeWidth={1.25} />
              <p className="font-serif italic text-lg text-nous-text">
                {filter === "stale" ? "No stale signals" : "No signals kept yet"}
              </p>
              <p className="font-sans text-[11px] text-nous-subtle max-w-md mx-auto leading-relaxed">
                {filter === "stale"
                  ? "Everything here still feels current — or nothing has aged past three weeks."
                  : (
                    <>
                      Open a zine’s Semiotics section, flip a commerce touchpoint, and choose{" "}
                      <span className="text-nous-text">Desire</span> or{" "}
                      <span className="text-nous-text">Reference</span>. Unlike Thimble (sourcing)
                      or Pocket (media), Atelier stores commerce-as-taste.
                    </>
                  )}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((obj) => {
                const stale = isAtelierObjectStale(obj);
                return (
                  <article
                    key={obj.id}
                    className="bg-white border border-nous-border flex flex-col min-h-[360px]"
                  >
                    <div className="aspect-[4/3] bg-stone-100 border-b border-nous-border overflow-hidden relative">
                      {obj.image_url ? (
                        <img
                          src={obj.image_url}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-nous-subtle">
                          <Pin size={22} strokeWidth={1.25} />
                        </div>
                      )}
                      {stale && (
                        <span className="absolute top-3 left-3 font-mono text-[7px] uppercase tracking-widest bg-white/95 px-2 py-1 text-nous-subtle">
                          Still resonant?
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 border border-nous-border p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateAtelierObjectIntent(
                                obj.id,
                                obj.signal_type === "acquisition" ? "acquisition_signal" : "desire",
                                ownerUid,
                              )
                            }
                            className={`px-2 py-1 font-sans text-[7px] uppercase tracking-widest font-black ${
                              obj.intent !== "reference"
                                ? "bg-stone-900 text-white"
                                : "text-nous-subtle"
                            }`}
                          >
                            Desire
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAtelierObjectIntent(obj.id, "reference", ownerUid)}
                            className={`px-2 py-1 font-sans text-[7px] uppercase tracking-widest font-black ${
                              obj.intent === "reference"
                                ? "bg-stone-900 text-white"
                                : "text-nous-subtle"
                            }`}
                          >
                            Reference
                          </button>
                        </div>
                        {obj.commerce_source === "shopify" && (
                          <span className="font-mono text-[8px] uppercase tracking-wider text-nous-subtle">
                            Shopify
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle -mt-1">
                        {intentLabel(obj.intent)}
                      </span>
                      <h3 className="font-serif italic text-xl text-nous-text tracking-tight leading-snug">
                        {obj.motif}
                      </h3>
                      {(obj.vendor || obj.price) && (
                        <p className="font-mono text-[8px] uppercase tracking-wider text-nous-subtle">
                          {[obj.vendor, obj.price].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="font-serif italic text-sm text-nous-subtle leading-relaxed line-clamp-3">
                        {obj.targeting_rationale || obj.context || "Kept as taste evidence from a zine touchpoint."}
                      </p>
                      {obj.zineTitle && (
                        <p className="font-sans text-[9px] text-nous-subtle mt-auto pt-2 border-t border-nous-border">
                          From <span className="text-nous-text">{obj.zineTitle}</span>
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        {obj.link ? (
                          <a
                            href={obj.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-sans text-[8px] uppercase tracking-widest font-black text-nous-text border-b border-current pb-0.5"
                          >
                            Open source <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-3">
                          {stale && (
                            <button
                              type="button"
                              onClick={() => confirmAtelierResonance(obj.id, ownerUid)}
                              className="inline-flex items-center gap-1.5 font-sans text-[8px] uppercase tracking-widest font-black text-nous-text"
                              aria-label={`Confirm ${obj.motif} still resonates`}
                            >
                              <RefreshCw size={11} /> Still yes
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => unpinAtelierObject(obj.id, ownerUid)}
                            className="inline-flex items-center gap-1.5 font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text"
                            aria-label={`Release signal for ${obj.motif}`}
                          >
                            <PinOff size={12} /> Release
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ChamberShell>
  );
};
