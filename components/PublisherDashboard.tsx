import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ZineMetadata } from "../types";
import { useUser } from "../contexts/UserContext";
import { fetchUserZines } from "../services/firebaseUtils";
import {
  deriveArtifactReleaseReadiness,
} from "../lib/publisher/releaseReadiness";
import type { ApprovalItem } from "../lib/publisher/types";
import {
  destinationRequiresPublish,
  destinationToExportMode,
  type ExportChamberMode,
} from "../lib/publisher/artifactExportActions";
import {
  fetchShopifyConnectionStatus,
  type ShopifyConnectionStatus,
  type ShopifyPackInspection,
} from "../services/shopifyExportService";
import { readIntelHubPressHandoff } from "../lib/intelHubWorkflow";
import { ExportChamber } from "./ExportChamber";
import { ReleaseDesk, ArtifactSelector } from "./publisher/ReleaseDesk";
import { ApprovalQueue } from "./publisher/ApprovalQueue";
import { DestinationCards } from "./publisher/DestinationCards";
import { ArtifactDetailPanel } from "./publisher/ArtifactDetailPanel";
import {
  PerformancePanel,
  SponsorPanel,
  DeliverabilityPanel,
} from "./publisher/PerformancePanel";
import { ShopifyPressBridge } from "./ShopifyPressBridge";
import { ReleaseStageChecklist } from "./publisher/ReleaseStageChecklist";

type PublisherMode = "release" | "performance";

function routeTo(path: string) {
  if (path.startsWith("http")) {
    window.open(path, "_blank", "noopener,noreferrer");
    return;
  }
  window.dispatchEvent(
    new CustomEvent("mimi:route-request", { detail: { path } }),
  );
}

export const PublisherDashboard: React.FC<{
  forcedMode?: PublisherMode;
}> = ({ forcedMode }) => {
  const { user, profile } = useUser();
  const ownerUid = user?.uid || profile?.uid;
  const [mode, setMode] = useState<PublisherMode>(forcedMode ?? "release");
  const [artifacts, setArtifacts] = useState<ZineMetadata[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopifyConnection, setShopifyConnection] = useState<ShopifyConnectionStatus | null>(
    null,
  );
  const [shopifyInspection, setShopifyInspection] = useState<ShopifyPackInspection | null>(
    null,
  );
  const [exportChamberOpen, setExportChamberOpen] = useState(false);
  const [exportInitialMode, setExportInitialMode] = useState<ExportChamberMode>("pdf");
  const [exportPublishIntent, setExportPublishIntent] = useState(false);

  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
  }, [forcedMode]);

  useEffect(() => {
    if (!ownerUid) {
      setArtifacts([]);
      setLoading(false);
      return;
    }
    void fetchUserZines(ownerUid, true).then((zines) => {
      const list = zines || [];
      setArtifacts(list);
      setSelectedId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
      setLoading(false);
    });
  }, [ownerUid]);

  useEffect(() => {
    void fetchShopifyConnectionStatus()
      .then(setShopifyConnection)
      .catch(() => setShopifyConnection(null));
  }, []);

  const selected = useMemo(
    () => artifacts.find((z) => z.id === selectedId) ?? null,
    [artifacts, selectedId],
  );

  const readiness = useMemo(() => {
    if (!selected) return null;
    return deriveArtifactReleaseReadiness(selected, {
      shopifyConnection,
      shopifyInspection,
      intelHandoff: readIntelHubPressHandoff(),
    });
  }, [selected, shopifyConnection, shopifyInspection]);

  const handleApprovalAction = useCallback((item: ApprovalItem) => {
    if (item.actionPath) routeTo(item.actionPath);
  }, []);

  const openExportChamber = useCallback(
    (destinationId?: string) => {
      if (!selected) return;
      const mode = destinationId ? destinationToExportMode(destinationId) : "pdf";
      setExportInitialMode(mode || "pdf");
      setExportPublishIntent(
        destinationId ? destinationRequiresPublish(destinationId) : false,
      );
      setExportChamberOpen(true);
    },
    [selected],
  );

  const handleExport = useCallback(
    (destinationId: string) => {
      openExportChamber(destinationId);
    },
    [openExportChamber],
  );

  const handleMetadataUpdate = useCallback((updated: ZineMetadata) => {
    setArtifacts((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
  }, []);

  if (!ownerUid) {
    return (
      <div className="w-full min-h-[320px] flex items-center justify-center p-8 bg-stone-950 text-stone-400">
        <p className="font-serif italic">Sign in to open the Publisher Console.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-850 pb-6">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 mb-2">
            The Press · Release control
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white tracking-tight">
            Publisher Console
          </h1>
          <p className="font-sans text-sm text-stone-500 mt-2 max-w-lg">
            Verify the artifact is complete, sourced, approved, and packaged — then see what
            happened after publication.
          </p>
        </div>
        <div className="flex bg-stone-900 border border-stone-800 p-1" role="tablist">
          {!forcedMode &&
            (["release", "performance"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 font-mono text-[8px] uppercase tracking-widest transition-all min-h-10 ${
                  mode === m
                    ? "bg-stone-100 text-stone-950 font-black"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {m === "release" ? "Release" : "Performance"}
              </button>
            ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto relative z-10">
        {mode === "performance" ? (
          <div className="space-y-8">
            <PerformancePanel artifacts={artifacts} />
            <SponsorPanel />
            <DeliverabilityPanel />
          </div>
        ) : loading ? (
          <p className="font-sans text-stone-500">Loading artifacts…</p>
        ) : !selected || !readiness ? (
          <div className="border border-dashed border-stone-800 p-10 text-center space-y-4">
            <p className="font-serif italic text-xl text-stone-400">No artifact selected</p>
            <ArtifactSelector
              artifacts={artifacts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <ArtifactSelector
              artifacts={artifacts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <ReleaseDesk
              readiness={readiness}
              onPrimaryAction={() => {
                if (readiness.unresolvedCount > 0) {
                  const path = readiness.recommendation.primaryActionPath;
                  if (path) routeTo(path);
                  else routeTo("/studio");
                  return;
                }
                openExportChamber();
              }}
              onReviewChecks={() => routeTo("/studio")}
              onPreview={() => routeTo(`https://mimi.fish/s/${readiness.artifactId}`)}
              onOpenExport={() => openExportChamber()}
            />

            <ReleaseStageChecklist stages={readiness.stages} onNavigate={routeTo} />

            <ApprovalQueue items={readiness.approvals} onAction={handleApprovalAction} />

            <DestinationCards
              destinations={readiness.destinations}
              artifactId={readiness.artifactId}
              onPreviewWeb={() =>
                routeTo(`https://mimi.fish/s/${readiness.artifactId}`)
              }
              onExport={handleExport}
            />

            <ArtifactDetailPanel metadata={selected} readiness={readiness} />

            <ShopifyPressBridge
              artifactTitle={readiness.title}
              artifactId={readiness.artifactId}
              onInspectionChange={setShopifyInspection}
            />

            {exportChamberOpen && selected && (
              <ExportChamber
                metadata={selected}
                initialMode={exportInitialMode}
                publishIntent={exportPublishIntent}
                onMetadataUpdate={handleMetadataUpdate}
                onClose={() => setExportChamberOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
