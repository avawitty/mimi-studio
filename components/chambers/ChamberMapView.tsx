import React, { useMemo, useState } from "react";
import {
  CANON_INFRASTRUCTURE,
  CANON_MODULES,
  type CanonInfrastructure,
  type CanonModule,
  type CanonModuleMaturity,
  type CanonModuleStatus,
  type StudioPhase,
} from "../../lib/productCanon";
import type { ChamberIntent } from "../../lib/chamberIntents";
import { ChamberIndex } from "../studio-os/ChamberIndex";
import { ContextTray } from "../studio-os/ContextTray";
import {
  useDossierContext,
  type ActiveDossier,
} from "../studio-os/DossierContext";
import { NextAction } from "../studio-os/NextAction";
import { StudioShell } from "../studio-os/StudioShell";
import { DossierFolder } from "../studio-os/artifacts/DossierFolder";
import { OrientationShell } from "../studio-os/families/OrientationShell";
import { getVisualPacket } from "../studio-os/manifests/visualPackets";

const STATUS_LABEL: Record<CanonModuleStatus, string> = {
  live: "Live",
  aliased: "Aliased",
  stub: "Stub",
  missing: "Missing",
};

const MATURITY_LABEL: Record<CanonModuleMaturity, string> = {
  prototype: "Prototype",
  evolving: "Evolving",
  established: "Established",
};

const INFRA_STATUS_LABEL: Record<CanonInfrastructure["status"], string> = {
  live: "Live",
  hardening: "Hardening",
  proposed: "Proposed",
};

const PHASE_STATUS: Record<StudioPhase, string> = {
  collect: "Material is still arriving. Nothing needs to look resolved yet.",
  understand: "Evidence is ready to be read before a direction is chosen.",
  shape: "A point of view is forming and can now be made explicit.",
  compose: "The approved direction is active on the worktable.",
  approve: "An interpretation is waiting to be accepted, repaired, or refused.",
  publish: "The proof is ready for packaging and release decisions.",
  preserve: "The released work is ready for durable custody.",
};

type ChamberMapMode = "studio-map" | "architecture-registry";

export interface ChamberMapViewProps {
  onNavigate?: (mode: string) => void;
  onOpenFind?: () => void;
  initialMode?: ChamberMapMode;
}

export type CanonStatusCounts = Record<
  CanonModuleStatus | "all",
  number
>;

export function getCanonStatusCounts(
  modules: CanonModule[] = CANON_MODULES,
): CanonStatusCounts {
  const counts: CanonStatusCounts = {
    all: modules.length,
    live: 0,
    aliased: 0,
    stub: 0,
    missing: 0,
  };
  for (const module of modules) {
    counts[module.status] += 1;
  }
  return counts;
}

function actionForDossier(
  dossier: ActiveDossier | null,
  recentMaterialIds: string[],
): { label: string; sentence: string; intent: ChamberIntent } {
  if (!dossier) {
    return {
      label: "Continue the thought",
      sentence: "A loose desk begins with material, not a filing decision.",
      intent: { type: "capture" },
    };
  }

  switch (dossier.phase) {
    case "collect":
      return {
        label: "Read the signal",
        sentence: "Mimi can now read the gathered material without flattening it.",
        intent: {
          type: "research",
          query: dossier.title,
          contextIds: recentMaterialIds,
        },
      };
    case "understand":
      return {
        label: "Shape the direction",
        sentence: "The evidence is distinct enough to propose an editorial direction.",
        intent: { type: "shape-direction", dossierId: dossier.id },
      };
    case "shape":
      return {
        label: "Compose the proof",
        sentence: "The direction can travel into composition without being re-entered.",
        intent: { type: "compose", dossierId: dossier.id },
      };
    case "compose":
      return {
        label: "Continue composing",
        sentence: "The active proof is still being built on the worktable.",
        intent: { type: "compose", dossierId: dossier.id },
      };
    case "approve":
      return {
        label: "Review the final proof",
        sentence: "The composition is ready for a deliberate release decision.",
        intent: {
          type: "approve",
          dossierId: dossier.id,
          decisionId: `${dossier.id}:final-proof`,
        },
      };
    case "publish":
      return {
        label: "Open The Press",
        sentence: "The approved object is ready to be packaged and released.",
        intent: { type: "publish", artifactId: dossier.id },
      };
    case "preserve":
      return {
        label: "File the artifact",
        sentence: "The released work can now enter the archive with custody intact.",
        intent: { type: "preserve", artifactId: dossier.id },
      };
    default: {
      const exhaustivePhase: never = dossier.phase;
      throw new Error(`Unhandled studio phase: ${exhaustivePhase}`);
    }
  }
}

const StudioMap: React.FC<{
  onNavigate: (mode: string) => void;
}> = ({ onNavigate }) => {
  const { activeDossier, recentMaterials } = useDossierContext();
  const phase = activeDossier?.phase ?? "collect";
  const action = actionForDossier(
    activeDossier,
    recentMaterials.map((material) => material.id),
  );
  const metadata = activeDossier
    ? `${activeDossier.fragmentCount} fragments · ${activeDossier.sourceCount} sources · direction ${activeDossier.directionStatus}`
    : `${recentMaterials.length} loose material${recentMaterials.length === 1 ? "" : "s"} · no dossier assigned`;

  return (
    <OrientationShell packet={getVisualPacket("desk-index")}>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-start">
        <div className="space-y-7">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--mimi-pencil,#8a877f)]">
              Current phase
            </p>
            <h1 className="mt-1 font-serif text-4xl font-medium leading-none md:text-5xl">
              {activeDossier ? activeDossier.phase : "Loose capture"}
            </h1>
          </div>

          <DossierFolder
            kicker={activeDossier ? "Current dossier" : "Loose desk"}
            title={activeDossier?.title ?? "Unfiled material"}
            metadata={metadata}
            tabLabel={activeDossier ? "Active dossier" : "Loose desk"}
            annotation={
              activeDossier
                ? "the direction can change; the evidence stays attached"
                : "leave it loose until meaning forms"
            }
            showRedMark
          />

          <NextAction
            label={action.label}
            sentence={action.sentence}
            intent={action.intent}
          />
        </div>

        <ContextTray className="lg:pt-16" />
      </div>

      <p className="mt-9 max-w-3xl border-t border-[var(--mimi-rule,#d8d4c9)] pt-4 font-serif text-xl italic text-[var(--mimi-pencil,#8a877f)]">
        {PHASE_STATUS[phase]}
      </p>

      <ChamberIndex onNavigate={onNavigate} className="mt-9" />
    </OrientationShell>
  );
};

const RegistryModuleRow: React.FC<{
  module: CanonModule;
  onNavigate?: (mode: string) => void;
}> = ({ module, onNavigate }) => (
  <article className="grid gap-3 border-t border-[var(--mimi-rule,#d8d4c9)] py-4 md:grid-cols-[minmax(0,1fr)_auto]">
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif text-xl">{module.name}</h3>
        <span className="border border-[var(--mimi-rule,#d8d4c9)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
          {STATUS_LABEL[module.status]}
        </span>
        {module.maturity ? (
          <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
            {MATURITY_LABEL[module.maturity]}
          </span>
        ) : null}
      </div>
      <p className="font-mono text-[8px] tracking-[0.06em] text-[var(--mimi-pencil,#8a877f)]">
        {module.canonicalRoute} → {module.implementedMode} · {module.component}
      </p>
      <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--mimi-pencil,#8a877f)]">
        {module.family} · {module.phase} · {module.layer}
      </p>
      <p className="text-sm leading-relaxed">{module.engine}</p>
      <p className="max-w-3xl text-sm leading-relaxed text-[var(--mimi-pencil,#8a877f)]">
        {module.userFlow}
      </p>
      {module.notes ? (
        <p className="max-w-3xl font-serif text-sm italic text-[var(--mimi-pencil,#8a877f)]">
          {module.notes}
        </p>
      ) : null}
    </div>
    {onNavigate && module.implementedMode ? (
      <button
        type="button"
        onClick={() =>
          onNavigate(module.canonicalRoute.replace(/^\//, ""))
        }
        className="min-h-11 self-start border border-[var(--mimi-ink,#111110)] px-4 font-mono text-[8px] uppercase tracking-[0.2em]"
      >
        Open
      </button>
    ) : null}
  </article>
);

const RegistryInfrastructureRow: React.FC<{
  infrastructure: CanonInfrastructure;
}> = ({ infrastructure }) => (
  <article className="border-t border-[var(--mimi-rule,#d8d4c9)] py-4">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-serif text-lg">{infrastructure.name}</h3>
      <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-pencil,#8a877f)]">
        {INFRA_STATUS_LABEL[infrastructure.status]}
      </span>
    </div>
    <p className="mt-1 text-sm text-[var(--mimi-pencil,#8a877f)]">
      {infrastructure.purpose}
    </p>
    <p className="mt-1 font-mono text-[8px] tracking-[0.06em] text-[var(--mimi-pencil,#8a877f)]">
      Owns: {infrastructure.owns.join(", ")}
    </p>
    {infrastructure.notes ? (
      <p className="mt-1 font-serif text-sm italic text-[var(--mimi-pencil,#8a877f)]">
        {infrastructure.notes}
      </p>
    ) : null}
  </article>
);

const ArchitectureRegistry: React.FC<{
  onNavigate?: (mode: string) => void;
}> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<CanonModuleStatus | "all">("all");
  const [query, setQuery] = useState("");
  const statusCounts = useMemo(() => getCanonStatusCounts(), []);
  const modules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...CANON_MODULES]
      .sort((a, b) => a.priority - b.priority)
      .filter((module) => filter === "all" || module.status === filter)
      .filter((module) => {
        if (!normalizedQuery) return true;
        return [
          module.name,
          module.id,
          module.engine,
          module.canonicalRoute,
          module.family,
          module.phase,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      });
  }, [filter, query]);
  const summaryLine = `${statusCounts.all} modules · ${statusCounts.live} live · ${statusCounts.aliased} aliased · ${CANON_INFRASTRUCTURE.length} substrates`;

  return (
    <OrientationShell packet={getVisualPacket("codex-index")}>
      <header className="max-w-3xl border-b border-[var(--mimi-rule,#d8d4c9)] pb-6">
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--mimi-pencil,#8a877f)]">
          Developer mode · Canon registry
        </p>
        <h1 className="mt-2 font-serif text-4xl">Architecture Registry</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--mimi-pencil,#8a877f)]">
          Route registration and product maturity remain separate. This surface
          preserves component, engine, flow, notes, and infrastructure records.
        </p>
        <p className="mt-3 font-mono text-[8px] tracking-[0.08em] text-[var(--mimi-pencil,#8a877f)]">
          {summaryLine}
        </p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--mimi-pencil,#8a877f)]">
            Find in registry
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-12 w-full border-b border-[var(--mimi-ink,#111110)] bg-transparent px-1 font-serif text-xl outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {(["all", "live", "aliased", "stub", "missing"] as const).map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`min-h-11 border px-3 font-mono text-[8px] uppercase tracking-[0.18em] ${
                  filter === key
                    ? "border-[var(--mimi-ink,#111110)] bg-[var(--mimi-ink,#111110)] text-[var(--mimi-bone,#f4f1ea)]"
                    : "border-[var(--mimi-rule,#d8d4c9)] text-[var(--mimi-pencil,#8a877f)]"
                }`}
              >
                {key} {statusCounts[key]}
              </button>
            ),
          )}
        </div>
      </div>

      <section className="mt-7" aria-label="Canon modules">
        {modules.map((module) => (
          <RegistryModuleRow
            key={module.id}
            module={module}
            onNavigate={onNavigate}
          />
        ))}
      </section>

      <section className="mt-12" aria-labelledby="substrates-heading">
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--mimi-pencil,#8a877f)]">
          Platform · Shared substrate
        </p>
        <h2 id="substrates-heading" className="mt-1 font-serif text-3xl">
          Substrates
        </h2>
        <div className="mt-4">
          {CANON_INFRASTRUCTURE.map((infrastructure) => (
            <RegistryInfrastructureRow
              key={infrastructure.id}
              infrastructure={infrastructure}
            />
          ))}
        </div>
      </section>
    </OrientationShell>
  );
};

export const ChamberMapView: React.FC<ChamberMapViewProps> = ({
  onNavigate,
  onOpenFind,
  initialMode = "studio-map",
}) => {
  const [mode, setMode] = useState<ChamberMapMode>(initialMode);
  const { activeDossier } = useDossierContext();
  const phase = activeDossier?.phase ?? "collect";
  const navigate = (target: string) => {
    if (target === "chamber-map") {
      setMode("studio-map");
    }
    onNavigate?.(target);
  };

  return (
    <StudioShell
      family="orientation"
      phase={phase}
      title={mode === "studio-map" ? "Studio desk" : "Architecture registry"}
      activeAnchor={mode === "studio-map" ? "map" : "find"}
      onNavigate={navigate}
      onOpenFind={() => {
        if (onOpenFind) {
          onOpenFind();
        } else {
          setMode("architecture-registry");
        }
      }}
    >
      <div className="sticky top-0 z-20 border-b border-[var(--mimi-rule,#d8d4c9)] bg-[var(--mimi-bone,#f4f1ea)]/95 px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl gap-5">
          <button
            type="button"
            aria-pressed={mode === "studio-map"}
            onClick={() => setMode("studio-map")}
            className="min-h-11 border-b border-transparent font-mono text-[8px] uppercase tracking-[0.22em] aria-pressed:border-[var(--mimi-ink,#111110)]"
          >
            Studio Map
          </button>
          <button
            type="button"
            aria-pressed={mode === "architecture-registry"}
            onClick={() => setMode("architecture-registry")}
            className="min-h-11 border-b border-transparent font-mono text-[8px] uppercase tracking-[0.22em] aria-pressed:border-[var(--mimi-ink,#111110)]"
          >
            Architecture Registry
          </button>
        </div>
      </div>
      {mode === "studio-map" ? (
        <StudioMap onNavigate={navigate} />
      ) : (
        <ArchitectureRegistry onNavigate={onNavigate} />
      )}
    </StudioShell>
  );
};
