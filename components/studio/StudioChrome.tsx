import React from "react";
import { GripVertical, Menu, Moon, Sun, User } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import type { StudioTheme } from "../../hooks/useStudioTheme";

export const StudioChrome: React.FC<{
  theme: StudioTheme;
  onToggleTheme: () => void;
  onOpenMenu?: () => void;
  mobileStudioView?: "editor" | "cover";
  onMobileStudioViewChange?: (view: "editor" | "cover") => void;
  isMobile?: boolean;
  viewMode?: string;
  isGenerating?: boolean;
  isHighLatency?: boolean;
  statusMessage?: string;
  isLoading?: boolean;
}> = ({
  theme,
  onToggleTheme,
  onOpenMenu,
  mobileStudioView = "editor",
  onMobileStudioViewChange,
  isMobile,
  viewMode = "studio",
  isGenerating = false,
  isHighLatency = false,
  statusMessage,
  isLoading = false,
}) => {
  const { user, profile } = useUser();
  const isDark = theme === "dark";
  const creatorPath = [
    { label: "Collect", modes: ["scribe", "darkroom"] },
    { label: "Shape", modes: ["pocket", "wardrobe", "the-edit", "tailor"] },
    { label: "Create", modes: ["studio", "briefs", "quiet-studio", "moodboard"] },
    { label: "Publish", modes: ["the-press", "editorial-home"] },
  ];
  const activePathIndex = Math.max(
    0,
    creatorPath.findIndex((step) => step.modes.includes(viewMode)),
  );

  const [timeString, setTimeString] = React.useState("");
  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (mode: string) => {
    switch (mode) {
      case "studio":
        return "Studio";
      case "briefs":
        return "Brief Calibration";
      case "moodboard":
        return "Mood Board";
      case "darkroom":
        return "Darkroom";
      case "oracle":
        return "The Oracle";
      case "nebula":
        return "Nebula";
      case "archival":
        return "Archival";
      case "profile":
        return "Profile";
      case "memberships":
        return "Memberships";
      case "editorial-home":
        return "Editorial Home";
      case "the-press":
        return "The Press";
      case "pocket":
        return "Pocket";
      case "ui-audit":
        return "UI Audit";
      case "signature":
        return "Signature";
      case "tailor":
        return "Tailor";
      case "wardrobe":
        return "Wardrobe";
      case "scry":
        return "Scry";
      case "the-edit":
        return "The Edit";
      case "mimi-drop":
        return "Mimi Drop";
      case "proscenium":
        return "Proscenium";
      case "sanctuary":
        return "Sanctuary";
      case "ward":
        return "The Ward";
      case "private-studio":
        return "Private Studio";
      case "thimble":
        return "Thimble";
      case "loom":
        return "Loom";
      default:
        return mode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  return (
<<<<<<< HEAD
    <header className="studio-chrome relative shrink-0 border-b studio-border px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 z-20 overflow-hidden">
=======
    <header
      className={`studio-chrome relative shrink-0 border-b studio-border px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 z-20 overflow-hidden${
        isMobile ? " studio-chrome--mobile-safe" : ""
      }`}
    >
>>>>>>> origin/main
      {/* Top Shimmer Progress Line during generation / high latency */}
      {isGenerating && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/20 overflow-hidden z-30">
          <div className="h-full w-1/3 bg-amber-500 animate-[shimmer_1.5s_infinite_linear] shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      )}

      {/* Brand & View Title with Skeleton Fallback */}
      <div className="flex flex-col leading-none select-none">
        {isLoading ? (
          <div className="space-y-1.5 py-1">
            <div className="h-6 w-20 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-none" />
            <div className="h-2 w-28 bg-stone-200/60 dark:bg-stone-800/60 animate-pulse rounded-none" />
          </div>
        ) : (
          <>
            <button
              type="button"
              aria-label="Return to Mimi Studio"
              className={`w-fit overflow-hidden transition-opacity ${
                isGenerating ? "opacity-90 cursor-wait" : "hover:opacity-80 cursor-pointer"
              }`}
              onClick={() => {
                if (!isGenerating) {
                  window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "studio" }));
                }
              }}
            >
              <span className="block font-serif text-[27px] leading-none tracking-[0.01em] studio-text-ink">
                Mimi
              </span>
            </button>
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] studio-text-muted mt-1.5 font-bold flex items-center gap-1.5">
              {getPageTitle(viewMode)}
            </span>
          </>
        )}
      </div>

      {/* Creator journey becomes live telemetry while Mimi is working. */}
      {isGenerating || isHighLatency || statusMessage ? (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 border studio-border bg-amber-500/5 dark:bg-amber-400/5 backdrop-blur-xs font-mono text-[9px] uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold animate-fadeIn">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span>
            {statusMessage || (isGenerating ? "SYNTHESIZING FRAGMENT..." : "HIGH LATENCY • TELEMETRY ACTIVE")}
          </span>
        </div>
      ) : (
        <nav aria-label="Creator path" className="hidden lg:flex items-center gap-1.5">
          {creatorPath.map((step, index) => {
            const isActiveStep = index === activePathIndex;
            const isComplete = index < activePathIndex;
            return (
              <React.Fragment key={step.label}>
                {index > 0 ? <span className="studio-text-muted text-[10px] opacity-50">→</span> : null}
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("mimi:change_view", { detail: step.modes[0] }),
                    )
                  }
                  className={`px-2.5 py-1.5 border font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                    isActiveStep
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold"
                      : isComplete
                        ? "studio-border studio-text-ink bg-black/[0.03] dark:bg-white/[0.03]"
                        : "border-transparent studio-text-muted hover:studio-text-ink hover:border-current/20"
                  }`}
                  aria-current={isActiveStep ? "step" : undefined}
                >
                  <span className="mr-1 opacity-60">0{index + 1}</span>
                  {step.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Controls & Navigation Identity */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile: full-menu trigger (desktop uses the App spine sidebar) */}
        {onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open full menu"
            className="md:hidden w-9 h-9 border studio-border flex items-center justify-center studio-text-muted hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all duration-300"
          >
            <Menu size={16} strokeWidth={1.5} />
          </button>
        ) : null}

        {/* Minimalist running clock */}
        {timeString && (
          <span className="font-mono text-[9px] uppercase tracking-widest studio-text-muted hidden sm:inline-block border studio-border px-2.5 py-1.5 select-none bg-black/[0.02] dark:bg-white/[0.02] font-semibold transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
            {timeString}
          </span>
        )}

        {/* Theme Switcher Button */}
        <button
          type="button"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
          className="w-9 h-9 border studio-border flex items-center justify-center studio-text-muted hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all hover:scale-105 duration-300"
        >
          {isDark ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
        </button>

        {/* User Handle / Sign-On Identity Button */}
        {isLoading ? (
          <div className="w-24 h-9 bg-stone-200 dark:bg-stone-800 animate-pulse border studio-border" />
        ) : user && !user.isAnonymous ? (
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "profile" }))}
            className={`flex items-center gap-2 px-3 py-1.5 border studio-border hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all hover:scale-[1.02] duration-300 font-mono text-[9px] uppercase tracking-widest font-black studio-text-ink h-9 ${
              isGenerating ? "opacity-75 cursor-wait" : ""
            }`}
          >
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                className="w-4 h-4 object-cover grayscale border studio-border rounded-none shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={12} strokeWidth={1.5} className="shrink-0" />
            )}
            <span className="truncate max-w-[80px]">{profile?.handle || "Swan"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("mimi:open_gateway"))}
            className="px-3.5 py-1.5 border studio-border hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all hover:scale-[1.02] duration-300 font-mono text-[9px] uppercase tracking-widest font-black studio-text-ink h-9"
          >
            Sign On
          </button>
        )}
      </div>
    </header>
  );
};

export const StudioColumnSplitHandle: React.FC<{
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}> = ({ onPointerDown }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize cover and input panels"
    onPointerDown={onPointerDown}
    className="hidden md:flex w-3 shrink-0 cursor-col-resize items-center justify-center studio-bg-workspace border-x border-dotted studio-divider hover:bg-black/5 dark:hover:bg-white/5 touch-none select-none"
  >
    <GripVertical size={14} className="studio-text-muted opacity-60" />
  </div>
);
