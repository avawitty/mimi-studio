import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "motion/react";
import {
  clearClientCaches,
  isStaleAssetError,
  recoverFromStaleAsset,
} from "../lib/staleChunkRecovery";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recovering: boolean;
}

function isIgnorableClientNoise(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to connect to metamask") ||
    lower.includes("metamask") ||
    lower.includes("window.ethereum")
  );
}

type ErrorKind = "stale" | "firestore" | "iframe-auth" | "generic";

function classifyError(raw: string): { kind: ErrorKind; message: string } {
  let errorMessage = raw || "An unexpected error occurred.";
  let kind: ErrorKind = "generic";

  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.error && parsed.operationType) {
      kind = "firestore";
      errorMessage = parsed.error;
    }
  } catch {
    /* not JSON */
  }

  if (isStaleAssetError(errorMessage)) {
    kind = "stale";
  } else if (
    errorMessage.includes("auth/internal-error") ||
    errorMessage.includes("handshake")
  ) {
    kind = "iframe-auth";
  }

  return { kind, message: errorMessage };
}

const COPY: Record<
  ErrorKind,
  { kicker: string; title: string; body: string; primary: string }
> = {
  stale: {
    kicker: "Edition mismatch",
    title: "This plate is from an older press run.",
    body: "A newer build of Mimi landed while this tab was open. Clear the local cache and reopen the current edition.",
    primary: "Clear cache & reopen",
  },
  firestore: {
    kicker: "Archive permissions",
    title: "The vault refused this request.",
    body: "If you just shipped rules or schema, redeploy Firestore security rules — then try again.",
    primary: "Reload plate",
  },
  "iframe-auth": {
    kicker: "Sign-on handshake",
    title: "This browser blocked the vault door.",
    body: "In-app browsers often strip third-party cookies. Open Mimi in Safari or Chrome, or use email sign-on.",
    primary: "Reload plate",
  },
  generic: {
    kicker: "Plate interrupted",
    title: "Something snagged the press.",
    body: "Mimi hit an unexpected fault. Reload to return to the worktable — your local draft usually survives.",
    primary: "Reload plate",
  },
};

const ErrorPlate: React.FC<{
  kind: ErrorKind;
  message: string;
  recovering: boolean;
  onPrimary: () => void;
  onSoftReload: () => void;
}> = ({ kind, message, recovering, onPrimary, onSoftReload }) => {
  const copy = COPY[kind];
  const caseNo = React.useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `PLT-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }, []);

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(120% 80% at 10% 0%, var(--mimi-cobalt-mist, #e8f0f6) 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(90,90,64,0.12) 0%, transparent 50%), linear-gradient(165deg, #f7f5f1 0%, #eef1f4 45%, #e8e4dc 100%)",
        color: "var(--mimi-ink, #0a0a0a)",
        fontFamily: '"Public Sans", system-ui, sans-serif',
      }}
    >
      {/* Atmospheric grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Soft moving wash */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70vmax] w-[70vmax] rounded-full blur-3xl"
        style={{ background: "rgba(155, 184, 206, 0.28)" }}
        animate={{ x: [0, 36, 0], y: [0, 22, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 h-[60vmax] w-[60vmax] rounded-full blur-3xl"
        style={{ background: "rgba(90, 90, 64, 0.14)" }}
        animate={{ x: [0, -28, 0], y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[1] w-full max-w-md"
      >
        {/* Manila tab */}
        <div className="flex items-end pl-6">
          <div
            className="relative -mb-px px-4 pt-2 pb-2.5 rounded-t-md"
            style={{ background: "var(--mimi-manila-tab, #E8DCB5)" }}
          >
            <span
              className="font-mono text-[9px] uppercase tracking-[0.22em] font-bold"
              style={{ color: "var(--mimi-manila-ink, #5C5334)" }}
            >
              Field report · {caseNo}
            </span>
          </div>
        </div>

        {/* Folder body */}
        <div
          className="border px-6 pt-7 pb-6 space-y-6 shadow-[0_24px_60px_-28px_rgba(20,18,12,0.45)]"
          style={{
            background: "var(--mimi-manila-body, #F0E6C8)",
            borderColor: "var(--mimi-manila-edge, #C9BA86)",
          }}
        >
          <div className="space-y-3">
            <p
              className="font-serif italic text-[42px] leading-none tracking-tight"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                color: "var(--mimi-ink, #0a0a0a)",
              }}
            >
              Mimi
            </p>
            <motion.div
              aria-hidden
              className="h-px w-full origin-left"
              style={{ background: "var(--mimi-manila-edge, #C9BA86)" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <p
              className="font-mono text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: "var(--mimi-olive, #5a5a40)" }}
            >
              {copy.kicker}
            </p>
            <h1
              className="font-serif italic text-2xl md:text-[1.75rem] leading-snug"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                color: "var(--mimi-ink, #0a0a0a)",
              }}
            >
              {copy.title}
            </h1>
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: "var(--mimi-stone, #78716c)" }}
            >
              {copy.body}
            </p>
          </div>

          <details className="group">
            <summary
              className="cursor-pointer list-none font-mono text-[9px] uppercase tracking-[0.2em] font-bold select-none"
              style={{ color: "var(--mimi-manila-ink, #5C5334)" }}
            >
              <span className="underline-offset-4 group-open:underline">Technical residue</span>
            </summary>
            <div
              className="mt-3 max-h-36 overflow-auto border p-3"
              style={{
                background: "var(--mimi-manila-sheet, #F7F3E8)",
                borderColor: "var(--mimi-manila-edge, #C9BA86)",
              }}
            >
              <p
                className="text-[11px] font-mono break-words leading-relaxed"
                style={{ color: "#8B2E2E" }}
              >
                {message}
              </p>
            </div>
          </details>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              disabled={recovering}
              onClick={onPrimary}
              className="w-full min-h-[48px] px-4 font-mono text-[11px] uppercase tracking-[0.2em] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "var(--mimi-ink, #0a0a0a)",
                color: "#FAF8F5",
              }}
            >
              {recovering ? "Reopening…" : copy.primary}
            </button>
            {kind === "stale" ? (
              <button
                type="button"
                disabled={recovering}
                onClick={onSoftReload}
                className="w-full min-h-[44px] px-4 border font-mono text-[10px] uppercase tracking-[0.18em] font-bold transition-colors"
                style={{
                  borderColor: "var(--mimi-manila-edge, #C9BA86)",
                  color: "var(--mimi-manila-ink, #5C5334)",
                  background: "transparent",
                }}
              >
                Soft reload only
              </button>
            ) : null}
          </div>
        </div>

        <p
          className="mt-5 text-center font-serif italic text-sm"
          style={{ color: "var(--mimi-stone, #78716c)" }}
        >
          The archive keeps what you approved.
        </p>
      </motion.div>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    recovering: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    if (error?.message && isIgnorableClientNoise(error.message)) {
      return { hasError: false, error: null, errorInfo: null };
    }
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error?.message && isIgnorableClientNoise(error.message)) {
      return;
    }
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });

    // Auto-heal stale chunks once — most MIME faults never need the plate.
    if (isStaleAssetError(error.message)) {
      void recoverFromStaleAsset(error.message).then((started) => {
        if (started) this.setState({ recovering: true });
      });
    }
  }

  private handlePrimary = () => {
    const raw = this.state.error?.message || "";
    if (isStaleAssetError(raw)) {
      this.setState({ recovering: true });
      void recoverFromStaleAsset(raw);
      return;
    }
    window.location.reload();
  };

  private handleSoftReload = () => {
    window.location.reload();
  };

  private handleHardRecover = async () => {
    this.setState({ recovering: true });
    await clearClientCaches();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const raw = this.state.error?.message || "An unexpected error occurred.";
      if (isIgnorableClientNoise(raw)) {
        return this.props.children;
      }

      const { kind, message } = classifyError(raw);

      return (
        <ErrorPlate
          kind={kind}
          message={message}
          recovering={this.state.recovering}
          onPrimary={kind === "stale" ? this.handlePrimary : this.handleHardRecover}
          onSoftReload={this.handleSoftReload}
        />
      );
    }

    return this.props.children;
  }
}
