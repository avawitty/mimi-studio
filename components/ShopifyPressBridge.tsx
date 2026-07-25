import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileArchive,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import {
  fetchShopifyConnectionStatus,
  inspectShopifyProductPack,
  type ShopifyConnectionStatus,
  type ShopifyPackInspection,
} from "../services/shopifyExportService";

export const ShopifyPressBridge: React.FC = () => {
  const [connection, setConnection] = useState<ShopifyConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [inspection, setInspection] = useState<ShopifyPackInspection | null>(null);
  const [inspectionError, setInspectionError] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionError("");
    try {
      setConnection(await fetchShopifyConnectionStatus());
    } catch (error) {
      setConnection(null);
      setConnectionError(error instanceof Error ? error.message : "Connection status unavailable.");
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    void refreshConnection();
  }, []);

  const isConnected = connection?.configured === true;
  const adminUrl = connection?.shop ? `https://${connection.shop}/admin/products` : null;
  const inspectionTone =
    inspection?.status === "ready"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : inspection?.status === "needs-review"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  const handlePackInspection = async (file: File) => {
    setIsInspecting(true);
    setInspectionError("");
    try {
      const result = await inspectShopifyProductPack(await file.arrayBuffer(), file.name);
      setInspection(result);
    } catch (error) {
      console.error("MIMI // Shopify Pack Inspector", error);
      setInspection(null);
      setInspectionError("Mimi could not inspect this release pack.");
    } finally {
      setIsInspecting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border border-stone-850 bg-[#121112] p-6 space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-[#95BF47]" />
            <h3 className="font-serif text-lg font-bold text-white">Shopify Bridge</h3>
          </div>
          <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500 leading-relaxed">
            Inspect · approve · hand off a Shopify-ready product release
          </p>
        </div>
        {isConnected && (
          <span className="inline-flex items-center gap-1 px-2 py-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[8px] uppercase tracking-widest font-bold">
            <CheckCircle2 size={10} /> Connected
          </span>
        )}
      </div>

      <section className="border border-stone-800 bg-stone-950/70 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileArchive size={13} className="text-[#95BF47]" />
              <h4 className="font-mono text-[9px] uppercase tracking-[0.18em] font-black text-stone-200">
                Release Pack Inspector
              </h4>
            </div>
            <p className="font-serif italic text-[11px] text-stone-500 mt-1 max-w-xl">
              Review a Mimi Shopify ZIP before it reaches Shopify Admin. Inspection stays in this browser
              and never requires a store token.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isInspecting}
            className="shrink-0 px-4 py-2 border border-[#95BF47]/50 text-[#b8d67b] font-mono text-[8px] uppercase tracking-widest font-black hover:bg-[#95BF47]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isInspecting ? <Loader2 size={11} className="animate-spin" /> : <FileArchive size={11} />}
            {isInspecting ? "Inspecting" : "Inspect Product Pack"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            aria-label="Choose a Mimi Shopify product pack"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handlePackInspection(file);
            }}
          />
        </div>

        {inspectionError && (
          <div className="flex items-center gap-2 text-red-300 font-mono text-[9px]">
            <XCircle size={12} /> {inspectionError}
          </div>
        )}

        {inspection && (
          <div className="space-y-4 border-t border-stone-800 pt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {inspection.product?.imageUrls[0] ? (
                  <img
                    src={inspection.product.imageUrls[0]}
                    alt=""
                    className="w-16 h-16 object-cover border border-stone-700 bg-stone-900"
                  />
                ) : (
                  <div className="w-16 h-16 border border-stone-800 bg-stone-900 flex items-center justify-center">
                    <FileArchive size={18} className="text-stone-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-serif text-lg text-stone-100 truncate">
                    {inspection.product?.title || "Unreadable product pack"}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 truncate">
                    {inspection.filename} · {inspection.files.length} files
                    {inspection.product ? ` · $${inspection.product.price}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex self-start items-center gap-1.5 px-2.5 py-1 border font-mono text-[8px] uppercase tracking-widest font-black ${inspectionTone}`}
              >
                {inspection.status === "ready" ? (
                  <ShieldCheck size={11} />
                ) : inspection.status === "needs-review" ? (
                  <AlertTriangle size={11} />
                ) : (
                  <XCircle size={11} />
                )}
                {inspection.status === "ready"
                  ? "Ready for import"
                  : inspection.status === "needs-review"
                    ? "Review before import"
                    : "Invalid pack"}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              {inspection.checks.map((check) => (
                <div key={check.id} className="border border-stone-850 bg-[#121112] p-3 flex gap-2">
                  {check.status === "pass" ? (
                    <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                  ) : check.status === "warning" ? (
                    <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest font-black text-stone-300">
                      {check.label}
                    </p>
                    <p className="font-serif text-[10px] leading-relaxed text-stone-500 mt-1">
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-stone-850 pt-6">
        <div>
          <h4 className="font-mono text-xs uppercase tracking-[0.18em] font-black text-stone-100">
            Server-owned Direct Publish
          </h4>
          <p className="font-serif italic text-sm text-stone-300 mt-2 leading-relaxed">
            Mimi can create drafts without placing a Shopify credential in this browser.
          </p>
        </div>

        <div
          className="border border-stone-700 bg-stone-950 p-4 flex items-start gap-3"
          role="status"
          aria-live="polite"
        >
          {isCheckingConnection ? (
            <Loader2 size={15} className="animate-spin text-stone-500 mt-0.5" />
          ) : isConnected ? (
            <ShieldCheck size={15} className="text-emerald-400 mt-0.5" />
          ) : (
            <Server size={15} className="text-amber-400 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest font-black text-stone-100">
              {isCheckingConnection
                ? "Checking server connection"
                : isConnected
                  ? "Draft publishing ready"
                  : "Server setup required"}
            </p>
            <p className="font-serif text-sm leading-relaxed text-stone-300 mt-2">
              {isConnected
                ? `${connection?.shop} · GraphQL ${connection?.apiVersion} · ${
                    connection?.mode === "client_credentials"
                      ? "short-lived server token"
                      : "server-held Admin token"
                  }`
                : connectionError ||
                  "Configure the Shopify store and app credentials in Mimi's deployment environment."}
            </p>
            {!isCheckingConnection && !isConnected && (
              <div className="mt-3 border-t border-stone-800 pt-3">
                <p className="font-mono text-[11px] uppercase tracking-wider font-bold text-stone-400">
                  Required server variables
                </p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-stone-300 break-words">
                  SHOPIFY_SHOP + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
                </p>
                <p className="mt-2 font-serif text-sm leading-relaxed text-stone-400">
                  Keep these in the deployment environment without a <code className="font-mono">VITE_</code> prefix.
                  They must never be sent to the browser.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="font-serif italic text-sm text-stone-300 leading-relaxed">
          The app needs only <code className="font-mono text-xs not-italic text-stone-100">write_products</code>.
          Every handoff is forced to draft status, and the creator still approves the release before
          Mimi calls Shopify.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => void refreshConnection()}
            disabled={isCheckingConnection}
            className="min-h-11 px-4 py-2 border border-stone-600 text-stone-100 font-mono text-xs uppercase tracking-widest font-bold hover:border-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={10} className={isCheckingConnection ? "animate-spin" : ""} />
            Refresh status
          </button>
          {adminUrl && (
            <a
              href={adminUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 px-4 py-2 border border-stone-600 text-stone-100 font-mono text-xs uppercase tracking-widest font-bold hover:border-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all flex items-center gap-2"
            >
              Open Products <ExternalLink size={10} />
            </a>
          )}
        </div>
      </section>
    </div>
  );
};
