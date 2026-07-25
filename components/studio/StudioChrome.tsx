import React from "react";
import { GripVertical, Menu, Moon, Sun, User, Volume2 } from "lucide-react";
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
    <header className="studio-chrome relative z-20 grid h-[94px] shrink-0 grid-cols-[1fr_auto_1fr] items-center overflow-hidden border-b studio-border px-5 md:px-8">
      {/* Top Shimmer Progress Line during generation / high latency */}
      {isGenerating && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/20 overflow-hidden z-30">
          <div className="h-full w-1/3 bg-amber-500 animate-[shimmer_1.5s_infinite_linear] shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      )}

      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-9 w-9 items-center justify-center studio-text-muted transition-colors hover:studio-text-ink md:hidden"
          aria-label="Open Mimi chambers"
        >
          <Menu size={16} strokeWidth={1.25} />
        </button>
        <span className="hidden truncate font-mono text-[7px] uppercase tracking-[0.3em] studio-text-muted md:block">
          {isGenerating
            ? statusMessage || "Manifesting"
            : isHighLatency
              ? "Oracle warming"
              : getPageTitle(viewMode)}
        </span>
      </div>

      {isLoading ? (
        <div className="h-11 w-24 animate-pulse bg-stone-200/70 dark:bg-stone-800/70" />
      ) : (
        <button
          type="button"
          aria-label="Return to Mimi Studio"
          disabled={isGenerating}
          className="group relative px-4 py-1 text-center transition-opacity hover:opacity-70 disabled:cursor-wait disabled:opacity-60"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mimi:change_view", { detail: "studio" }),
            )
          }
        >
          <span className="block font-serif text-[50px] italic leading-[0.85] tracking-[-0.055em] studio-text-ink md:text-[54px]">
            Mimi
          </span>
          <span className="absolute -bottom-2 left-1/2 h-px w-10 -translate-x-1/2 bg-current opacity-15 transition-all group-hover:w-16" />
        </button>
      )}

      {/* Controls & Navigation Identity */}
      <div className="flex min-w-0 items-center justify-end gap-1.5 md:gap-3">
        {isMobile && onMobileStudioViewChange ? (
          <div className="flex border studio-border rounded-sm overflow-hidden mr-1">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => onMobileStudioViewChange("editor")}
              className={`px-2 py-1 font-mono text-[7px] uppercase tracking-widest transition-all active:scale-95 duration-200 ${
                mobileStudioView === "editor" ? "studio-bg-panel studio-text-ink font-bold" : "studio-text-muted hover:bg-black/5 dark:hover:bg-white/5"
              } ${isGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Input
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => onMobileStudioViewChange("cover")}
              className={`px-2 py-1 font-mono text-[7px] uppercase tracking-widest transition-all active:scale-95 duration-200 ${
                mobileStudioView === "cover" ? "studio-bg-panel studio-text-ink font-bold" : "studio-text-muted hover:bg-black/5 dark:hover:bg-white/5"
              } ${isGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Cover
            </button>
          </div>
        ) : null}

        <button
          type="button"
          title="Sound"
          className="hidden h-9 w-9 items-center justify-center studio-text-muted transition-colors hover:studio-text-ink sm:flex"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mimi:sound", { detail: { type: "click" } }),
            )
          }
        >
          <Volume2 size={15} strokeWidth={1.25} />
        </button>

        {/* Theme Switcher Button */}
        <button
          type="button"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full studio-text-muted transition-all hover:bg-black/5 hover:studio-text-ink active:scale-90 dark:hover:bg-white/5"
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
            className={`flex h-9 items-center gap-2 rounded-full bg-[#373533] px-4 font-mono text-[8px] uppercase tracking-[0.18em] text-stone-100 shadow-lg transition-all hover:bg-[#242321] active:scale-95 ${
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
            className="h-9 rounded-full bg-[#373533] px-4 font-mono text-[8px] uppercase tracking-[0.18em] text-stone-100 shadow-lg transition-all hover:bg-[#242321] active:scale-95"
          >
            Sign In
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
