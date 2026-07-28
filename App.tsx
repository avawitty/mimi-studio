import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  lazy,
} from "react";
import { ThimbleDashboard } from "./components/ThimbleDashboard";
import { ArchitectureView } from "./components/ArchitectureView";
import { CommandDrawer } from "./components/CommandDrawer";
import { ThimbleIndex } from "./components/ThimbleIndex";
import { PublicSharePage } from "./components/PublicSharePage";
import { PublicZineSharePage } from "./components/PublicZineSharePage";
import { PublicDnaBadge } from "./components/PublicDnaBadge";
import { MimiYouPublicRoute } from "./components/MimiYouPublicRoute";
import { MimiShowcaseDirectory } from "./components/MimiShowcaseDirectory";
import { StackView } from "./components/StackView";
import { SubscriptionMatrix } from "./components/SovereignCommerceEngine";

import {
  AppState,
  ToneTag,
  ZineMetadata,
  DriftEvent,
  MediaFile,
  ZineContent,
} from "./types";
import { t } from "./lib/i18n";
import {
  generateThreadZineSpine,
  generateZineTitlesFromThreads,
  generateGEOPack,
} from "./services/geminiService";
import { resolveApiKey } from "./services/apiKeyService";
import { diagnoseOracle } from "./services/geminiClient";
import { createZine } from "./services/zineGenerator";
import { clearApprovedUsedContext } from "./services/usedContextService";
import {
  saveZineToProfile,
  fetchZineById,
  auth,
  isCaptiveInWebview,
  updateZineMetadata,
} from "./services/firebase";
import { ZineConfiguration } from "./components/ZineConfiguration";
import { ApiKeyShield } from "./components/ApiKeyShield";
import { ZineGenerationOptions } from "./types";
import { InputStudio } from "./components/InputStudio";
import { StudioChrome } from "./components/studio/StudioChrome";
import { injectJSONLD } from "./utils/seoHelper";

import { archiveManager } from "./services/archiveManager";
import { SUPERINTELLIGENCE_PROMPTS } from "./constants";
import { AnalysisDisplay } from "./components/AnalysisDisplay";
import { ElevatorLoader } from "./components/ElevatorLoader";
import { ViewSkeleton } from "./components/loaders/ViewSkeleton";
import { UserProvider, useUser } from "./contexts/UserContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AgentProvider, useAgents } from "./contexts/AgentContext";
import { MENU_STRUCTURE } from "./components/navigationConfig";
import { canonicalizeMimiRoute } from "./lib/productCanon";
import { getEditorialCompileExport } from "./lib/editCompileExport";
import { LegalDocumentPage } from "./components/LegalDocumentPage";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { useTactileAudio } from "./hooks/useTactileAudio";

// Lazy load views to reduce initial request count and prevent 429 errors
import { MobileNavigation } from "./components/MobileNavigation";
import { MobileProfileModal } from "./components/MobileProfileModal";
const ArchiveCloudNebula = lazy(
  () => import("./components/ArchiveCloudNebula"),
);
const ArchivalView = lazy(() =>
  import("./components/ArchivalView").then((m) => ({
    default: m.ArchivalView,
  })),
);
const UserProfileView = lazy(() =>
  import("./components/UserProfileView").then((m) => ({
    default: m.UserProfileView,
  })),
);
const UIAuditView = lazy(() => import("./components/UIAuditView"));
const Web3TasteManifest = lazy(() =>
  import("./components/Web3TasteManifest").then((m) => ({
    default: m.Web3TasteManifest,
  })),
);
const SignatureView = lazy(() =>
  import("./components/SignatureView").then((m) => ({
    default: m.SignatureView,
  })),
);
const TheEdit = lazy(() =>
  import("./components/TheEdit").then((m) => ({ default: m.TheEdit })),
);
const BriefCalibrationChamber = lazy(() =>
  import("./components/BriefCalibrationChamber").then((m) => ({ default: m.BriefCalibrationChamber })),
);
const SanctuaryView = lazy(() =>
  import("./components/SanctuaryView").then((m) => ({
    default: m.SanctuaryView,
  })),
);
const TailorView = lazy(() =>
  import("./components/tailor/TailorHub").then((m) => ({ default: m.TailorHub })),
);
const WardrobeView = lazy(() =>
  import("./components/WardrobeView").then((m) => ({
    default: m.WardrobeView,
  })),
);
const ScryView = lazy(() =>
  import("./components/ScryView").then((m) => ({ default: m.ScryView })),
);
const DarkroomView = lazy(() =>
  import("./components/DarkroomView").then((m) => ({
    default: m.DarkroomView,
  })),
);

const ProsceniumView = lazy(() =>
  import("./components/ProsceniumView").then((m) => ({
    default: m.ProsceniumView,
  })),
);
import { TheScribe } from "./components/TheScribe";

const SolitarianCaseStudy = lazy(() =>
  import("./components/SolitarianCaseStudy").then((m) => ({
    default: m.SolitarianCaseStudy,
  })),
);

const CaptiveSentinel = lazy(() =>
  import("./components/CaptiveSentinel").then((m) => ({
    default: m.CaptiveSentinel,
  })),
);
const TheWard = lazy(() =>
  import("./components/TheWard").then((m) => ({ default: m.TheWard })),
);
const PatronMintView = lazy(() =>
  import("./components/PatronMintView").then((m) => ({
    default: m.PatronMintView,
  })),
);
import { ApiSwitcher } from "./components/ApiSwitcher";
import { MimiGateway } from "./components/MimiGateway";
import { ClinicalAuditDrawer } from "./components/ClinicalAuditDrawer";
import { ProfileHoverCard } from "./components/ProfileHoverCard";
import { AuthAction } from "./components/AuthAction";

const DossierView = lazy(() => import("./components/DossierView"));
const StrategyStudio = lazy(() =>
  import("./components/StrategyStudio").then((m) => ({
    default: m.StrategyStudio,
  })),
);
const ThreadsView = lazy(() =>
  import("./components/ThreadsView").then((m) => ({ default: m.ThreadsView })),
);
const NarrativeThreadsView = lazy(() =>
  import("./components/NarrativeThreadsView").then((m) => ({
    default: m.NarrativeThreadsView,
  })),
);
const TasteGraph = lazy(() =>
  import("./components/TasteGraph").then((m) => ({ default: m.TasteGraph })),
);
const LatentConstellation = lazy(() =>
  import("./components/LatentConstellation").then((m) => ({
    default: m.LatentConstellation,
  })),
);
const EditorialFrontPage = lazy(() =>
  import("./components/EditorialFrontPage").then((m) => ({ default: m.EditorialFrontPage })),
);
const PublisherDashboard = lazy(() =>
  import("./components/PublisherDashboard").then((m) => ({ default: m.PublisherDashboard })),
);
const Pocket = lazy(() =>
  import("./components/Pocket").then((m) => ({ default: m.Pocket })),
);
const TheLens = lazy(() =>
  import("./components/TheLens").then((m) => ({ default: m.TheLens })),
);
const ObsidianMirror = lazy(() =>
  import("./components/ObsidianMirror").then((m) => ({ default: m.ObsidianMirror })),
);
const NotificationsView = lazy(() =>
  import("./components/NotificationsView").then((m) => ({
    default: m.NotificationsView,
  })),
);
const SelectionMemoryCapture = lazy(() =>
  import("./components/SelectionMemoryCapture").then((m) => ({ default: m.SelectionMemoryCapture })),
);
const ResearchMemory = lazy(() =>
  import("./components/ResearchMemory").then((m) => ({ default: m.ResearchMemory })),
);
const ScribeChamber = lazy(() =>
  import("./components/chambers/ScribeChamber").then((m) => ({ default: m.ScribeChamber })),
);
const MimiDollsChamber = lazy(() =>
  import("./components/chambers/MimiDollsChamber").then((m) => ({ default: m.MimiDollsChamber })),
);
const MoodBoardChamber = lazy(() =>
  import("./components/chambers/MoodBoardChamber").then((m) => ({ default: m.MoodBoardChamber })),
);
const PrivateStudioChamber = lazy(() =>
  import("./components/chambers/PrivateStudioChamber").then((m) => ({ default: m.PrivateStudioChamber })),
);
const QuietStudioView = lazy(() =>
  import("./components/QuietStudioView").then((m) => ({ default: m.QuietStudioView })),
);
const TheEditChamber = lazy(() =>
  import("./components/chambers/TheEditChamber").then((m) => ({ default: m.TheEditChamber })),
);
const ThePressChamber = lazy(() =>
  import("./components/chambers/ThePressChamber").then((m) => ({ default: m.ThePressChamber })),
);
const ChamberMapView = lazy(() =>
  import("./components/chambers/ChamberMapView").then((m) => ({ default: m.ChamberMapView })),
);
const TheOracle = lazy(() =>
  import("./components/TheOracle").then((m) => ({ default: m.TheOracle })),
);
const ActionBoard = lazy(() =>
  import("./components/ActionBoard").then((m) => ({ default: m.ActionBoard })),
);
const TransformationPathView = lazy(() =>
  import("./components/TransformationPathView").then((m) => ({
    default: m.TransformationPathView,
  })),
);
const TasteDiscoveryView = lazy(() =>
  import("./components/TasteDiscoveryView").then((m) => ({
    default: m.TasteDiscoveryView,
  })),
);
const TheGEOEngine = lazy(() =>
  import("./components/TheGEOEngine").then((m) => ({
    default: m.TheGEOEngine,
  })),
);
const NousReadingList = lazy(() =>
  import("./components/NousReadingList").then((m) => ({
    default: m.NousReadingList,
  })),
);

const MoodboardComposer = lazy(() =>
  import("./components/MoodboardComposer").then((m) => ({
    default: m.MoodboardComposer,
  })),
);
const CodexView = lazy(() =>
  import("./components/CodexView").then((m) => ({ default: m.CodexView })),
);
const BrandVoiceView = lazy(() =>
  import("./components/BrandVoiceView").then((m) => ({ default: m.BrandVoiceView })),
);
const TheForecast = lazy(() =>
  import("./components/TheForecast").then((m) => ({ default: m.TheForecast })),
);
const ColorQCEngine = lazy(() =>
  import("./components/ColorQCEngine").then((m) => ({
    default: m.ColorQCEngine,
  })),
);
const BrandIntakeView = lazy(() =>
  import("./components/BrandIntakeView").then((m) => ({
    default: m.BrandIntakeView,
  })),
);
const IntelHub = lazy(() =>
  import("./components/IntelHub").then((m) => ({ default: m.IntelHub })),
);
const CommunityManifesto = lazy(() =>
  import("./components/CommunityManifesto").then((m) => ({
    default: m.CommunityManifesto,
  })),
);
const RegistryAlert = lazy(() =>
  import("./components/RegistryAlert").then((m) => ({
    default: m.RegistryAlert,
  })),
);
import { AestheticTokensMap } from "./components/AestheticTokensMap";
const ImperialPatronageModal = lazy(() =>
  import("./components/ImperialPatronageModal").then((m) => ({
    default: m.ImperialPatronageModal,
  })),
);
const Founding50Tracker = lazy(() => import("./components/Founding50Tracker"));
const CheckoutSuccessView = lazy(() =>
  import("./components/CheckoutSuccessView").then((m) => ({
    default: m.CheckoutSuccessView,
  })),
);
const MimiDrop = lazy(() =>
  import("./components/MimiDrop").then((m) => ({ default: m.MimiDrop })),
);


import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Sparkles,
  LayoutGrid,
  User,
  Menu,
  X,
  ChevronDown,
  Newspaper,
  LogOut,
  ShieldAlert,
  Zap,
  Camera,
  Key,
  Radio,
  Activity as ActivityIcon,
  Archive,
  Moon,
  Sun,
  Tv,
  Scissors,
  FlaskConical,
  Eye,
  Radar,
  Compass,
  Info,
  Cpu,
  ShieldCheck,
  Briefcase,
  BookOpen,
  Volume2,
  VolumeX,
  Target,
  Link2,
  Layers,
  History,
  Settings,
  Loader2,
  Search,
  Lock,
  QrCode,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { GuideModal } from "./components/GuideModal";

// ... (Rest of existing subcomponents: BinderRing, NavigationDrawer, DatabaseVoid) ...
// BINDER RING COMPONENT
const BinderRing = ({ className }: { className?: string }) => (
  <div
    className={`absolute right-[-10px] w-5 h-5 bg-[#050505] border border-nous-border z-50 flex items-center justify-center ${className}`}
  >
    <div className="w-8 h-2.5 bg-nous-base0 transform translate-x-1" />
  </div>
);

const NavigationDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  logout: () => void;
  profile: any;
  systemStatus: any;
  setUiMode: (mode: "stage" | "control") => void;
  onOpenGuide: () => void;
  isGenerating?: boolean;
}> = ({
  isOpen,
  onClose,
  viewMode,
  setViewMode,
  logout,
  profile,
  systemStatus,
  setUiMode,
  onOpenGuide,
  isGenerating = false,
}) => {
  const handleNav = (mode: string) => {
    if (isGenerating) return;
    setViewMode(mode);
    onClose();
  };
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const hidden = profile?.hiddenMenuItems || [];
  const filteredMenuItems = MENU_STRUCTURE
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Exclude hidden menu items
        if (hidden.includes(item.mode)) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.note.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      }),
    }))
    .filter((section) => section.items.length > 0);

  const totalChambersCount = React.useMemo(() => {
    return MENU_STRUCTURE.reduce((acc, section) => {
      const visibleItems = section.items.filter((item) => !hidden.includes(item.mode));
      return acc + visibleItems.length;
    }, 0);
  }, [hidden]);

  const filteredChambersCount = React.useMemo(() => {
    return filteredMenuItems.reduce((acc, section) => {
      return acc + section.items.length;
    }, 0);
  }, [filteredMenuItems]);

  const { user } = useUser();
  const { currentPalette, toggleMode } = useTheme();
  const isDark = currentPalette?.isDark;
  const recommendedPath = [
    { number: "01", label: "Collect", note: "Bring in source material", mode: "scribe" },
    { number: "02", label: "Shape", note: "Find the editorial angle", mode: "the-edit" },
    { number: "03", label: "Create", note: "Develop the issue", mode: "studio" },
    { number: "04", label: "Publish", note: "Prepare the release", mode: "the-press" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9990] backdrop-blur-xs pointer-events-auto"
          />

          {/* Full-Height Sliding Drawer Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            data-studio-theme={isDark ? "dark" : "light"}
            className="studio-worktable fixed top-0 left-0 h-full w-full max-w-sm z-[9995] studio-bg-panel border-r studio-border text-nous-text overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b studio-border flex items-center justify-between studio-bg-surface select-none">
              <div className="flex items-center gap-3">
                <img
                  src={isDark ? "/brand/official/mimi-primary-wordmark-dark.svg" : "/brand/official/mimi-primary-wordmark-light.svg"}
                  alt="Mimi"
                  className="w-16 h-8 object-contain object-left shrink-0"
                />
                <div className="flex flex-col border-l studio-border pl-3">
                  <span className="font-mono text-[8px] uppercase tracking-[0.22em] font-bold leading-none studio-text-ink">
                    Rooms
                  </span>
                  <span className="font-sans text-[10px] leading-snug studio-text-muted mt-1">
                    Start with the creator path, or browse every chamber.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border studio-border flex items-center justify-center studio-text-muted hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                title="Close Menu"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* High Latency / Generation Guard Banner */}
            {isGenerating && (
              <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between font-mono text-[8px] uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold animate-pulse">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  SYNTHESIS IN PROGRESS
                </span>
                <span>NAV GUARDED</span>
              </div>
            )}

            {!searchQuery && (
              <div className="px-6 py-4 border-b studio-border studio-bg-surface">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-extrabold studio-text-ink">
                    Recommended creator path
                  </span>
                  <span className="font-sans text-[10px] studio-text-muted">4 steps</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recommendedPath.map((step) => {
                    const isActive = viewMode === canonicalizeMimiRoute(step.mode);
                    return (
                      <button
                        key={step.mode}
                        type="button"
                        onClick={() => handleNav(step.mode)}
                        className={`text-left p-3 border transition-colors ${
                          isActive
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "studio-border bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 font-bold">
                          {step.number} / {step.label}
                        </span>
                        <span className="block font-sans text-[10px] leading-snug studio-text-muted mt-1">
                          {step.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Elegant Search Filter */}
            <div className="px-6 py-4 border-b studio-border studio-bg-surface/50">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search all rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    className="w-full bg-stone-100/60 dark:bg-stone-900/60 border studio-border text-nous-text text-[11px] tracking-wide py-2.5 pl-9 pr-10 focus:outline-none focus:border-stone-450 dark:focus:border-stone-700 transition-colors placeholder:text-stone-400/85 font-sans"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-all focus:outline-none p-1 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                      title="Clear filter"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                <div 
                  id="chamber-filter-count"
                  className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-extrabold bg-stone-100/60 dark:bg-stone-900/60 px-3 py-2.5 border studio-border select-none"
                  title={`${filteredChambersCount} of ${totalChambersCount} chambers active`}
                >
                  {filteredChambersCount}/{totalChambersCount}
                </div>
              </div>
            </div>

            {/* Canonical Directory (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredMenuItems.map((section) => (
                  <motion.div
                    key={section.section}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -15 }}
                    transition={{ type: "spring", damping: 30, stiffness: 280, mass: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.25em] font-black text-neutral-400 dark:text-neutral-500">
                        ✥ {section.section}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <AnimatePresence mode="popLayout">
                        {section.items.map((item) => {
                          const isActive = viewMode === canonicalizeMimiRoute(item.mode);
                          return (
                            <motion.button
                              layout
                              initial={{ opacity: 0, scale: 0.97, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.15 } }}
                              transition={{
                                type: "spring",
                                damping: 28,
                                stiffness: 300,
                                opacity: { duration: 0.2 }
                              }}
                              key={item.mode}
                              onClick={() => handleNav(item.mode)}
                              aria-current={isActive ? "page" : undefined}
                              className={`w-full text-left group flex flex-col gap-1 p-3.5 border transition-all duration-200 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 ${
                                isActive
                                  ? "bg-stone-100 dark:bg-stone-900 border-amber-500/70 dark:border-amber-500/50 shadow-sm"
                                  : "bg-[#fcfcfa] dark:bg-[#161513] border-stone-200 dark:border-stone-850 hover:bg-stone-100 dark:hover:bg-[#1f1e1c] hover:border-stone-300 dark:hover:border-stone-700"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-serif italic text-lg studio-text-ink group-hover:translate-x-1 transition-transform duration-200">
                                  {isActive ? <span className="text-amber-500 font-sans font-bold not-italic mr-1">✥</span> : null}
                                  {item.label}
                                </span>
                                <span className="font-mono text-[7px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-extrabold px-1.5 py-0.5 border border-transparent group-hover:border-neutral-200 dark:group-hover:border-neutral-800">
                                  {item.mode}
                                </span>
                              </div>
                              <span className="font-sans text-[8px] uppercase tracking-wider text-stone-500 group-hover:text-stone-400 block leading-normal">
                                {item.note}
                              </span>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
                {filteredMenuItems.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="py-12 text-center select-none"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-widest text-stone-400 font-extrabold">
                      No matching chambers
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Polished System Alignment Footer */}
            <div className="border-t studio-border p-5 flex flex-col gap-4 studio-bg-surface select-none">
              {/* Profile / Guest Status Card */}
              {user && !user.isAnonymous ? (
                <div className="flex items-center justify-between border studio-border p-2.5 bg-stone-50/50 dark:bg-stone-900/30">
                  <button
                    onClick={() => {
                      setViewMode("profile");
                      onClose();
                    }}
                    className="flex items-center gap-2.5 text-left group"
                  >
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt=""
                        className="w-7 h-7 object-cover grayscale border studio-border rounded-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center border studio-border rounded-none bg-stone-100 dark:bg-stone-800 text-stone-400">
                        <User size={12} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-col leading-none">
                      <span className="font-mono text-[9px] uppercase tracking-wider studio-text-ink font-extrabold group-hover:underline">
                        {profile?.handle || "Swan"}
                      </span>
                      <span className="font-mono text-[6.5px] uppercase tracking-[0.25em] text-neutral-400 font-extrabold mt-1">
                        AUTHORIZED IDENTITY
                      </span>
                    </div>
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    title="Sign Out"
                    className="p-1.5 border studio-border hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-colors rounded-none cursor-pointer"
                  >
                    <LogOut size={12} strokeWidth={1.5} />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent("mimi:open_gateway"));
                  }}
                  className="w-full py-2.5 border studio-border hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors font-mono text-[9px] uppercase tracking-[0.2em] font-black studio-text-ink flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <User size={12} strokeWidth={1.5} />
                  <span>Sign On / Inquire</span>
                </motion.button>
              )}

              {/* Application Guide Row */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGuide();
                }}
                className="w-full py-2 border studio-border hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors font-mono text-[8px] uppercase tracking-widest font-extrabold studio-text-ink flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <HelpCircle size={11} strokeWidth={1.5} className="text-amber-500" />
                <span>Application Guide</span>
              </motion.button>

              {/* Theme & Actions Row */}
              <div className="flex items-center gap-2 w-full">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={toggleMode}
                  className="flex-1 py-2 border studio-border hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors font-mono text-[8px] uppercase tracking-widest font-extrabold studio-text-ink flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isDark ? <Sun size={11} strokeWidth={1.5} /> : <Moon size={11} strokeWidth={1.5} />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent("mimi:open_patron_modal"));
                  }}
                  className="flex-1 py-2 border studio-border hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors font-mono text-[8px] uppercase tracking-widest font-extrabold studio-text-ink flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Zap size={10} strokeWidth={1.5} className="text-amber-500" />
                  <span>Patron Plan</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const DatabaseVoid: React.FC = () => (
  <div className="fixed inset-0 z-[50000] bg-[#050505] flex flex-col items-center justify-center p-8 text-center space-y-12">
    <div className="space-y-6 max-w-lg">
      <div className="relative mx-auto w-24 h-24 border border-red-900/50 flex items-center justify-center">
        <div className="absolute inset-0 border-t border-red-500 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio size={32} className="text-red-500 animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <h1 className="font-serif text-5xl italic tracking-tighter text-nous-subtle">
          Registry Void.
        </h1>
        <p className="font-mono text-[9px] uppercase tracking-widest text-red-500 font-bold">
          Connection Failure
        </p>
      </div>
      <p className="font-serif italic text-xl text-nous-subtle leading-relaxed text-balance">
        The app cannot locate the database. I have updated the configuration to
        look for 'mimizine'.
      </p>
    </div>

    <button
      onClick={() => window.location.reload()}
      className="px-8 py-4 border border-red-900 text-red-500 font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-red-900/20 hover:text-red-400 transition-all flex items-center gap-4 animate-pulse"
    >
      <ActivityIcon size={16} /> [ FORCE RE-INITIALIZATION ]
    </button>
  </div>
);

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[60000] bg-red-600 text-white text-center py-2 font-mono text-[10px] uppercase tracking-widest font-bold shadow-md"
        >
          <div className="flex items-center justify-center gap-2">
            <ShieldAlert size={14} />
            {t("app.offline")}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const KeyBlockedBanner: React.FC = () => {
  const { isKeyBlocked, setKeyBlocked } = useUser();

  return (
    <AnimatePresence>
      {isKeyBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[60000] bg-amber-600 dark:bg-amber-950 text-white py-3 px-4 shadow-xl border-b border-amber-500 font-sans"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
            <div className="flex items-start gap-3">
              <ShieldAlert size={16} className="text-amber-200 mt-0.5 shrink-0 animate-bounce" />
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest font-black text-amber-200">Legacy AI Route Restricted</p>
                <p className="text-[11px] text-amber-50 leading-relaxed font-serif italic mt-0.5 text-balance">
                  A legacy Gemini request was blocked. Mimi now routes supported Oracle, analysis, vision, embedding, and image requests through the server AI Gateway. Reload and retry; provider-specific keys are no longer required for these flows.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
                  setKeyBlocked(false);
                }}
                className="bg-white text-amber-900 hover:bg-amber-100 transition-colors px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider font-bold shadow-sm"
              >
                Review AI Settings
              </button>
              <button
                onClick={() => setKeyBlocked(false)}
                className="hover:bg-white/15 transition-colors p-1.5 text-white"
                title="Dismiss warning"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { CreditMeter } from "./components/CreditMeter";

const useAppRouter = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback(
    (newPath: string, options?: { replace?: boolean }) => {
      if (options?.replace) {
        window.history.replaceState(null, "", newPath);
      } else {
        window.history.pushState(null, "", newPath);
      }
      setPath(newPath);
    },
    [],
  );

  useEffect(() => {
    const onRouteRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (detail?.path) {
        navigate(detail.path);
      }
    };
    window.addEventListener("mimi:route-request", onRouteRequest);
    return () => window.removeEventListener("mimi:route-request", onRouteRequest);
  }, [navigate]);

  useEffect(() => {
    if (path === "/" || path === "") {
      navigate("/studio", { replace: true });
    }
  }, [navigate, path]);

  return { path, navigate };
};

import { getAIProvider, getActiveProviderId, setGlobalAIProvider } from "./services/aiProvider";
import { getStoredKey, validateKey } from "./services/apiKeyService";

// Unified Intelligence Gate Service
export class IntelligenceGateService {
  private static instance: IntelligenceGateService;
  private validationCache: Record<string, { status: "checking" | "valid" | "invalid" | "fallback" | "unchecked"; error?: string }> = {};
  private validationListeners: Set<(provider: string, status: any) => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("mimi_key_updated", (e: any) => {
        if (e.detail && e.detail.provider) {
          this.validateStoredKey(e.detail.provider);
        }
      });
      // Trigger initial verification after a short delay
      setTimeout(() => {
        const providers: ("gemini" | "openai" | "anthropic")[] = ["gemini", "openai", "anthropic"];
        providers.forEach(p => this.validateStoredKey(p));
      }, 1000);
    }
  }

  public static getInstance(): IntelligenceGateService {
    if (!IntelligenceGateService.instance) {
      IntelligenceGateService.instance = new IntelligenceGateService();
    }
    return IntelligenceGateService.instance;
  }

  public getValidationStatus(provider: "gemini" | "openai" | "anthropic") {
    return this.validationCache[provider] || { status: "unchecked" };
  }

  public registerValidationListener(listener: (provider: string, status: any) => void) {
    this.validationListeners.add(listener);
    return () => this.validationListeners.delete(listener);
  }

  private notifyValidationChange(provider: string, status: any) {
    this.validationListeners.forEach(listener => {
      try {
        listener(provider, status);
      } catch (e) {
        console.error("Error in validation listener:", e);
      }
    });
  }

  public async validateStoredKey(provider: "gemini" | "openai" | "anthropic"): Promise<{ status: "checking" | "valid" | "invalid" | "fallback" | "unchecked"; error?: string }> {
    const key = getStoredKey(provider);
    if (!key) {
      const statusObj = { status: "fallback" as const };
      this.validationCache[provider] = statusObj;
      this.notifyValidationChange(provider, statusObj);
      return statusObj;
    }

    const currentStatus = this.validationCache[provider];
    if (currentStatus?.status === "checking") {
      return currentStatus;
    }

    const checkingObj = { status: "checking" as const };
    this.validationCache[provider] = checkingObj;
    this.notifyValidationChange(provider, checkingObj);

    try {
      const result = await validateKey(provider, key);
      const finalStatus = result.valid 
        ? { status: "valid" as const }
        : { status: "invalid" as const, error: result.error || "Validation failed" };
      
      this.validationCache[provider] = finalStatus;
      this.notifyValidationChange(provider, finalStatus);
      return finalStatus;
    } catch (e: any) {
      const errorStatus = { status: "invalid" as const, error: e.message || "Unknown error" };
      this.validationCache[provider] = errorStatus;
      this.notifyValidationChange(provider, errorStatus);
      return errorStatus;
    }
  }

  public getActiveProvider() {
    return getActiveProviderId();
  }

  public setProvider(provider: "gemini" | "openai" | "anthropic") {
    setGlobalAIProvider(provider);
    localStorage.setItem("mimi_active_llm", provider);
  }

  /**
   * Central entrypoint abstracting all model calls, with built-in automated failover
   * while the server routes supported model calls through the AI Gateway.
   */
  public async generateContentWithFailover(params: any): Promise<any> {
    const provider = getAIProvider();
    return await provider.generateContent(params);
  }

  public async generateTextWithFailover(prompt: string, systemInstruction?: string): Promise<string> {
    const provider = getAIProvider();
    if (provider.generateText) {
      return await provider.generateText(prompt, systemInstruction);
    }
    const res = await provider.generateContent({ contents: prompt, config: { systemInstruction } });
    return res.text || "";
  }
}

// Expose globally
if (typeof window !== "undefined") {
  (window as any).intelligenceGate = IntelligenceGateService.getInstance();
}

export const IntelligenceGateContext = React.createContext<{
  gate: IntelligenceGateService;
  generateText: (prompt: string, systemInstruction?: string) => Promise<string>;
  generateContent: (params: any) => Promise<any>;
}>({
  gate: IntelligenceGateService.getInstance(),
  generateText: (prompt, sys) => IntelligenceGateService.getInstance().generateTextWithFailover(prompt, sys),
  generateContent: (params) => IntelligenceGateService.getInstance().generateContentWithFailover(params),
});

export const useIntelligenceGate = () => React.useContext(IntelligenceGateContext);

export const App: React.FC = () => {
  const { playClick, playTransition, playShimmer, playSuccess } = useTactileAudio();
  const {
    user,
    profile,
    updateProfile,
    loading: authLoading,
    isElevatorLoading,
    setElevatorLoading,
    logout,
    setOracleStatus,
    systemStatus,
    activePersona,
    isDatabaseMissing,
    canGenerate,
    incrementGeneration,
    recordSession,
    login,
    completeEmailLogin,
    hasApiKey,
    forceBypassAuth,
    setUiMode,
  } = useUser();

  useEffect(() => {
    console.log("MIMI_DIAGNOSTIC // App Mounted.");
    console.log("MIMI_DIAGNOSTIC // Environment variables check:", {
      DEV: import.meta.env.DEV,
      MODE: import.meta.env.MODE,
      BASE_URL: import.meta.env.BASE_URL,
    });
    
    try {
      if (auth) {
        console.log("MIMI_DIAGNOSTIC // Auth Service is initialized successfully:", auth);
        console.log("MIMI_DIAGNOSTIC // Current Firebase auth user immediately on mount:", auth.currentUser);
      } else {
        console.error("MIMI_DIAGNOSTIC // Auth Service is undefined/null!");
      }
    } catch (e) {
      console.error("MIMI_DIAGNOSTIC // Error accessing auth service:", e);
    }
  }, []);

  // Ensure that Firebase Auth is fully validated before we check for API keys.
  // We memoize the hasApiKey status to prevent unnecessary re-renders when a user logs in.
  const memoizedHasApiKey = React.useMemo(() => {
    if (authLoading) {
      return true; // Keep shield closed while validating authentication
    }
    return hasApiKey;
  }, [authLoading, hasApiKey]);

  useEffect(() => {
    console.log("MIMI_DIAGNOSTIC // Auth State Update:", {
      user: user ? { uid: user.uid, isAnonymous: user.isAnonymous, email: user.email } : null,
      profile: profile ? { uid: profile.uid, handle: profile.handle, plan: profile.plan, uiMode: profile.uiMode } : null,
      authLoading,
      isDatabaseMissing,
      hasApiKey: memoizedHasApiKey,
    });
  }, [user, profile, authLoading, isDatabaseMissing, memoizedHasApiKey]);

  // Safety timeout: Ensure elevator loader eventually unmounts even if animations or states hang
  useEffect(() => {
    if (isElevatorLoading) {
      const timer = setTimeout(() => {
        console.warn("MIMI // Elevator Loader Safety Timeout: Forcing loader to unmount.");
        setElevatorLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isElevatorLoading, setElevatorLoading]);

  const uiMode = profile?.uiMode || "stage";
  const { currentPalette, toggleMode, isCRTEnabled, toggleCRT } = useTheme();
  const { activeAgents } = useAgents();

  const gateValue = React.useMemo(() => ({
    gate: IntelligenceGateService.getInstance(),
    generateText: (prompt: string, systemInstruction?: string) => IntelligenceGateService.getInstance().generateTextWithFailover(prompt, systemInstruction),
    generateContent: (params: any) => IntelligenceGateService.getInstance().generateContentWithFailover(params),
  }), []);

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileConsoleOpen, setIsMobileConsoleOpen] = useState(false);
  const [commandDrawerOpen, setCommandDrawerOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const { path, navigate } = useAppRouter();
  const pathParts = path.split("/").filter(Boolean);
  const isZineRoute = pathParts[0] === "zine" && pathParts[1];
  const urlZineId = isZineRoute ? pathParts[1] : null;
  const rawViewMode = pathParts[0] || "studio";
  const viewMode = isZineRoute ? "studio" : canonicalizeMimiRoute(rawViewMode);
  const isLegacyStyleLabRoute = [
    "art-style",
    "scryer",
    "style-scryer",
  ].includes(rawViewMode);
  const isLegacyDiagnosticsRoute = [
    "aesthetic-intelligence",
    "style-diagnostics",
  ].includes(rawViewMode);
  const tailorPanel =
    isLegacyStyleLabRoute
      ? "style-lab"
      : isLegacyDiagnosticsRoute
        ? "diagnostics"
        : pathParts[1] === "dossier"
          ? "dossier"
          : pathParts[1] === "evidence"
            ? "intake"
            : pathParts[1] === "style-lab"
              ? "style-lab"
              : pathParts[1] === "diagnostics"
                ? "diagnostics"
                : "blueprint";

  useEffect(() => {
    if (isLegacyStyleLabRoute) {
      navigate("/tailor/style-lab", { replace: true });
    } else if (isLegacyDiagnosticsRoute) {
      navigate("/tailor/diagnostics", { replace: true });
    }
  }, [
    isLegacyDiagnosticsRoute,
    isLegacyStyleLabRoute,
    navigate,
  ]);

  const setViewMode = useCallback(
    (mode: string) => {
      if (["art-style", "scryer", "style-scryer"].includes(mode)) {
        navigate("/tailor/style-lab");
        return;
      }
      if (["aesthetic-intelligence", "style-diagnostics"].includes(mode)) {
        navigate("/tailor/diagnostics");
        return;
      }
      const normalizedMode = canonicalizeMimiRoute(mode);
      if (normalizedMode === "mimi-dolls" || normalizedMode === "mimi-you") {
        navigate("/mimi-dolls");
        return;
      }
      if (normalizedMode === "studio") {
        navigate("/studio");
        return;
      }
      navigate(`/${normalizedMode}`);
    },
    [navigate, profile?.handle, user?.uid],
  );
  const [showQuotaShield, setShowQuotaShield] = useState(false);
  const [zineMetadata, setZineMetadata] = useState<ZineMetadata | null>(null);
  const [zineOptions, setZineOptions] = useState<ZineGenerationOptions>({
    style: "balanced",
    theme: "organic",
    contentFocus: "balanced",
    artStyle: "",
    aestheticTone: undefined,
    goals: "",
  });
  const [isDeepRefraction, setIsDeepRefraction] = useState(false);
  const [threadValue, setThreadValue] = useState<string>("");
  const [threadMedia, setThreadMedia] = useState<MediaFile[]>([]);
  const [threadHighFidelity, setThreadHighFidelity] = useState(false);
  const [showCaptiveSentinel, setShowCaptiveSentinel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isHeaderTranslucent, setIsHeaderTranslucent] = useState(false);
  const [tailorOverrides, setTailorOverrides] = useState<any>(null);
  const [isPatronMint, setIsPatronMint] = useState(false);
  const [showPatronModal, setShowPatronModal] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [hasSeenGateway, setHasSeenGateway] = useState(false);
  const [showProfileHover, setShowProfileHover] = useState(false);

  const [isHeaderDragActive, setIsHeaderDragActive] = useState(false);

  const handleHeaderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHeaderDragActive(true);
  };

  const handleHeaderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHeaderDragActive(false);
  };

  const handleHeaderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsHeaderDragActive(false);

    if (!user) return; // Needs login

    const files = Array.from(e.dataTransfer.files);
    const link =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");

    try {
      if (files.length > 0) {
        // Just take the first image if multiple
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            await archiveManager.saveToPocket(user.uid, "image", {
              content: base64,
              metadata: {
                source: "Header Drag Drop",
                filename: file.name,
                date: new Date().toISOString(),
              },
            });
            window.dispatchEvent(
              new CustomEvent("mimi:registry_alert", {
                detail: { message: `Image saved to pocket.`, type: "success" },
              }),
            );
          };
          reader.readAsDataURL(file);
        }
      } else if (link && (link.startsWith("http") || link.startsWith("www"))) {
        await archiveManager.saveToPocket(user.uid, "link", {
          content: link,
          metadata: {
            source: "Header Drag Drop",
            url: link,
            date: new Date().toISOString(),
          },
        });
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: { message: `Link saved to pocket.`, type: "success" },
          }),
        );
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };
  useEffect(() => {
    if (urlZineId) {
      if (!zineMetadata || zineMetadata.id !== urlZineId) {
        setLoadingMessage("Retrieving document...");
        setAppState(AppState.THINKING);
        fetchZineById(urlZineId)
          .then((zine) => {
            if (zine) {
              setZineMetadata(zine);
              setAppState(AppState.REVEALED);
            } else {
              setAppState(AppState.IDLE);
              navigate("/studio", { replace: true });
            }
          })
          .catch((err) => {
            console.error("MIMI // Failed to fetch zine by id from URL", err);
            setAppState(AppState.IDLE);
            navigate("/studio", { replace: true });
          });
      }
    } else if (zineMetadata) {
      // If we navigate to /studio or something while zine is open, we should close it.
      setZineMetadata(null);
      setAppState(AppState.IDLE);
    }
  }, [urlZineId]);

  // Lock elevator loader to active state while Firebase Auth is checking
  useEffect(() => {
    if (authLoading) {
      setElevatorLoading(true);
    }
  }, [authLoading, setElevatorLoading]);

  useEffect(() => {
    if (isElevatorLoading && !authLoading) {
      const timer = setTimeout(() => {
        console.warn(
          "MIMI // Elevator Loader Safety Timeout: Force clearing loader.",
        );
        setElevatorLoading(false);
      }, 10000); // 10 seconds max for elevator
      return () => clearTimeout(timer);
    }
  }, [isElevatorLoading, authLoading]);

  const [scribeTab, setScribeTab] = useState<
    "engine" | "mimi" | "cyrus" | "synthesis" | null
  >(null);
  const [scribeContext, setScribeContext] = useState<any>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const [proposalContext, setProposalContext] = useState<any>(null);
  const hasRecordedSession = useRef(false);

  useEffect(() => {
    import("./services/firebaseInit")
      .then(({ auth }) => {
        if (
          user &&
          !user.isAnonymous &&
          auth.currentUser &&
          !hasRecordedSession.current
        ) {
          recordSession().catch((err) =>
            console.error("MIMI // Record Session Unhandled Error:", err),
          );
          hasRecordedSession.current = true;
        }
      })
      .catch((err) => console.error("MIMI // FirebaseInit Import Error:", err));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (user && !user.isAnonymous) {
      setShowGateway(false);
      return;
    }

    if ((!user || user.isAnonymous) && !hasSeenGateway) {
      setShowGateway(true);
      setHasSeenGateway(true);
    }
  }, [user, authLoading, hasSeenGateway]);

  const [checkoutPlan, setCheckoutPlan] = useState<
    "core" | "optioning" | "pro" | "lab" | null
  >(null);
  const [checkoutInterval, setCheckoutInterval] = useState<"month" | "year">(
    "month",
  );
  const [isDriftDismissed, setIsDriftDismissed] = useState(false);
  const [isRegeneratingDrift, setIsRegeneratingDrift] = useState(false);

  const handleRegenerateGeoPack = async () => {
    if (!user || !profile) return;
    setIsRegeneratingDrift(true);
    try {
      const { collection, query, where, orderBy, limit, getDocs } =
        await import("firebase/firestore");
      const { db } = await import("./services/firebaseInit");

      const q = query(
        collection(db, "taste_events"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(10),
      );

      const snapshot = await getDocs(q);
      const events = snapshot.docs.map((doc) => doc.data());

      const contextString = events
        .map((e) => {
          return `Intent: ${e.input_context?.user_intent || "None"} | Text: ${e.input_context?.raw_text || "None"} | Archetype: ${e.output_context?.generated_archetype || "None"}`;
        })
        .join("\n");

      const intent =
        "Restructure and optimize based on my current evolutionary drift.";

      const pack = await generateGEOPack(
        intent,
        contextString,
        [],
        "analytical",
        profile,
      );

      if (pack) {
        await updateProfile({
          ...profile,
          geoProfile: {
            ...pack,
            lastSynthesized: Date.now(),
            driftScore: 0,
            driftAlert: false,
          },
        });
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "GEO Pack Updated. Drift Neutralized.",
              type: "success",
            },
          }),
        );
      }
    } catch (e) {
      console.error("MIMI // Drift Regeneration Failed:", e);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Failed to regenerate GEO Pack.", type: "error" },
        }),
      );
    } finally {
      setIsRegeneratingDrift(false);
      setIsDriftDismissed(true);
    }
  };

  useEffect(() => {
    injectJSONLD(viewMode);
  }, [viewMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const planParam = params.get("plan") || params.get("tier");
    const isSuccessPath = window.location.pathname.includes("/success");

    if ((checkoutStatus === "success" || isSuccessPath) && planParam) {
      const intervalParam = params.get("interval");
      // Legacy support: an older success_url used "lab_annual" as the plan.
      const normalizedPlan = planParam === "lab_annual" ? "lab" : planParam;
      const normalizedInterval =
        planParam === "lab_annual" || intervalParam === "year" ? "year" : "month";
      const validPlans = ["core", "optioning", "pro", "lab"] as const;
      if ((validPlans as readonly string[]).includes(normalizedPlan)) {
        setCheckoutPlan(normalizedPlan as (typeof validPlans)[number]);
        setCheckoutInterval(normalizedInterval);
        setViewMode("checkout-success");
      }
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    } else if (
      checkoutStatus === "canceled" ||
      window.location.pathname.includes("/canceled")
    ) {
      alert("Payment canceled.");
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    // Handle Email Link Sign In
    import("./services/firebaseInit")
      .then(({ auth }) => {
        import("firebase/auth")
          .then(({ isSignInWithEmailLink }) => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
              completeEmailLogin(window.location.href).catch((err) =>
                console.error(
                  "MIMI // Complete Email Login Unhandled Error:",
                  err,
                ),
              );
            }
          })
          .catch((err) => console.error("MIMI // Auth Import Error:", err));
      })
      .catch((err) => console.error("MIMI // FirebaseInit Import Error:", err));
  }, [completeEmailLogin]);

  useEffect(() => {
    if (profile?.zineOptions) {
      setZineOptions((prev) => ({ ...prev, ...profile.zineOptions }));
    }
  }, [profile?.zineOptions]);

  useEffect(() => {
    if (isCaptiveInWebview()) setShowCaptiveSentinel(true);

    // CHECK FOR PATRON MINT URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("view") === "patron_mint") {
      setIsPatronMint(true);
      // Clear query param to keep URL clean
      window.history.replaceState({}, document.title, "/");
    }

    const handleChangeView = async (e: any) => {
      if (e.detail === "reveal_artifact" && e.detail_id) {
        window.dispatchEvent(
          new CustomEvent("mimi:sound", { detail: { type: "transition" } }),
        );
        try {
          const zine = await fetchZineById(e.detail_id);
          if (zine) {
            navigate("/zine/" + zine.id);
            setZineMetadata(zine);
            setAppState(AppState.REVEALED);
          }
        } catch (err) {
          console.error("MIMI // Failed to fetch zine by id", err);
          setAppState(AppState.IDLE);
        }
        return;
      }
      if (e.detail === "scribe") {
        window.dispatchEvent(
          new CustomEvent("mimi:sound", { detail: { type: "click" } }),
        );
        setScribeTab("mimi");
        return;
      }
      if (e.detail) {
        window.dispatchEvent(
          new CustomEvent("mimi:sound", { detail: { type: "click" } }),
        );
        setViewMode(e.detail);
        setZineMetadata(null);
        setAppState(AppState.IDLE);
        if (e.detail === "studio" && e.detail_data) {
          setThreadValue(e.detail_data.context || e.detail_data);
          if (e.detail_data.initialMedia) {
            setThreadMedia(e.detail_data.initialMedia);
          }
          if (e.detail_data.isHighFidelity) {
            setThreadHighFidelity(true);
          } else {
            setThreadHighFidelity(false);
          }
        }
        if (e.detail === "about" && e.detail_data?.folder) {
          setProposalContext(e.detail_data.folder);
        }
      }
    };
    const handleSelectZine = (e: any) => {
      if (e.detail?.zine) {
        navigate("/zine/" + e.detail.zine.id);
        setZineMetadata(e.detail.zine);
        setAppState(AppState.REVEALED);
      }
    };
    const handleShowQuota = () => setShowQuotaShield(true);
    const handleOpenPatronModal = () => setShowPatronModal(true);
    const handleOpenGateway = () => setShowGateway(true);
    const handleOpenScribe = (e: any) => {
      if (e.detail) {
        setScribeTab(e.detail);
        if (e.detail_data) {
          setScribeContext(e.detail_data);
        }
      } else {
        setScribeTab("mimi");
      }
    };

    const handleMimiSound = (e: any) => {
      const type = e.detail?.type;
      if (type === "click") playClick();
      else if (type === "transition") playTransition();
      else if (type === "shimmer") playShimmer();
      else if (type === "success") playSuccess();
    };

    window.addEventListener("mimi:sound", handleMimiSound);
    window.addEventListener("mimi:change_view", handleChangeView);
    window.addEventListener("mimi:select_zine", handleSelectZine);
    window.addEventListener("mimi:show_quota_shield", handleShowQuota);
    window.addEventListener("mimi:open_patron_modal", handleOpenPatronModal);
    window.addEventListener("mimi:open_gateway", handleOpenGateway);
    window.addEventListener("mimi:open_scribe", handleOpenScribe);
    return () => {
      window.removeEventListener("mimi:sound", handleMimiSound);
      window.removeEventListener("mimi:change_view", handleChangeView);
      window.removeEventListener("mimi:select_zine", handleSelectZine);
      window.removeEventListener("mimi:show_quota_shield", handleShowQuota);
      window.removeEventListener(
        "mimi:open_patron_modal",
        handleOpenPatronModal,
      );
      window.removeEventListener("mimi:open_gateway", handleOpenGateway);
      window.removeEventListener("mimi:open_scribe", handleOpenScribe);
    };
  }, []);

  const handleGenerateThreadZine = useCallback(
    async (thread: any) => {
      if (!canGenerate) {
        if (profile?.planStatus === "ghost") {
          setShowGateway(true);
        } else {
          setShowPatronModal(true);
        }
        return;
      }
      setAppState(AppState.THINKING);
      setLoadingMessage("Weaving thread into narrative...");
      try {
        const pages = await generateThreadZineSpine(
          thread,
          profile,
          activePersona?.apiKey,
          zineOptions,
        );
        const titles = await generateZineTitlesFromThreads(
          [thread],
          profile,
          activePersona?.apiKey,
        );
        const title = titles[0] || "Thread Atlas";

        const zineContent = {
          meta: {
            mode: "editorial" as const,
            intent: thread.narrative,
            timestamp: Date.now(),
          },
          title,
          pages,
          taste_context: {
            active_archetype: "The Curator",
            active_palette: ["#000000", "#FFFFFF"],
            last_audit_summary: "Generated from thread",
          },
          structure: {
            hero_prompt:
              "A beautifully curated editorial view of the user's thread",
            pages: pages,
          },
          visual_guidance: {
            strict_palette: ["#000000", "#FFFFFF"],
            negative_prompt: "cluttered, messy, uncurated",
            composition_density: 0.5,
          },
        };

        const targetUid = profile?.uid || user?.uid || "ghost";
        const tone = "Editorial Stillness"; // Default tone for threads

        await incrementGeneration(2); // Full zine cost

        const id = await saveZineToProfile(
          targetUid,
          profile?.handle || "Ghost",
          profile?.photoURL,
          zineContent,
          tone,
          undefined,
          false,
          false,
          false,
          [],
          thread.narrative,
          [],
          false,
          undefined,
          undefined,
        );

        navigate("/zine/" + id);
        setZineMetadata({
          id,
          userId: targetUid,
          userHandle: profile?.handle || "Ghost",
          title: zineContent.title,
          tone,
          timestamp: Date.now(),
          likes: 0,
          content: zineContent,
          artifacts: [],
          originalInput: thread.narrative,
          transmissionsUsed: [],
          fragmentsUsed: [],
          createdAt: Date.now(),
          theme: "Editorial Stillness",
          aestheticVector: {},
        });
        setAppState(AppState.REVEALED);
      } catch (e) {
        console.error("MIMI // Failed to generate thread zine", e);
        setAppState(AppState.IDLE);
      }
    },
    [profile, user, activePersona, canGenerate],
  );

  const handleRefine = useCallback(
    async (text, media, tone, opts) => {
      if (!canGenerate) {
        if (profile?.planStatus === "ghost") {
          setShowGateway(true);
        } else {
          setShowPatronModal(true);
        }
        return;
      }
      setIsDeepRefraction(!!opts.deepThinking);
      setAppState(AppState.THINKING);
      window.dispatchEvent(
        new CustomEvent("mimi:sound", { detail: { type: "shimmer" } }),
      );

      const personaKey = activePersona?.apiKey
        ? activePersona.apiKey
        : undefined;

      try {
        // Fetch recent transmissions to provide cultural context
        let transmissions: any[] = [];
        try {
          const { collection, query, orderBy, limit, getDocs } =
            await import("firebase/firestore");
          const { db } = await import("./services/firebase");
          const q = query(
            collection(db, "public_transmissions"),
            orderBy("timestamp", "desc"),
            limit(10),
          );
          const snapshot = await getDocs(q);
          transmissions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (e) {
          console.warn("MIMI // Transmission context failed to load.", e);
        }

        const usedContext = opts.usedContext || [];
        const fragmentIds = usedContext.map(
          (entry: { atomId: string }) => entry.atomId,
        );
        const usedContextSnapshots = usedContext.map(
          (entry: {
            atomId: string;
            title: string;
            content: string;
            source?: string;
          }) => ({
            atomId: entry.atomId,
            title: entry.title,
            content: entry.content,
            source: entry.source,
          }),
        );

        const result = await createZine(
          text,
          media,
          tone,
          profile,
          { ...opts, usedContext },
          personaKey,
          transmissions,
          undefined,
          opts.selectedComponents,
          opts.zineOptions,
        );

        // Inject theme from options
        if (opts.zineOptions?.theme) {
          result.content.meta = result.content.meta || {};
          result.content.meta.theme = opts.zineOptions.theme;
        }

        let coverUrl =
          opts.studioCoverUrl ||
          media.find((file: { type: string; url?: string; data?: string }) => file.type === "image")
            ?.url ||
          media.find((file: { type: string; url?: string; data?: string }) => file.type === "image")
            ?.data;

        if (opts.studioCoverOverlays?.length) {
          result.content.meta = result.content.meta || {};
          result.content.meta.studioCoverOverlays = opts.studioCoverOverlays;
        }

        if (coverUrl && opts.studioCoverOverlays?.length) {
          const { resolveExportCoverUrl } = await import("./lib/studioCoverExport");
          coverUrl =
            (await resolveExportCoverUrl(coverUrl, opts.studioCoverOverlays)) ?? coverUrl;
        }

        const editorialCompile = getEditorialCompileExport();

        let cost = 2; // Default for full zine
        if (opts.isLite) cost = 1;
        if (opts.isHighFidelity || opts.deepThinking) cost = 3;

        await incrementGeneration(cost);
        const targetUid = profile?.uid || user?.uid || "ghost";
        const id = await saveZineToProfile(
          targetUid,
          profile?.handle || "Ghost",
          profile?.photoURL,
          result.content,
          tone,
          coverUrl,
          opts.deepThinking,
          opts.isPublic,
          opts.isLite,
          media,
          text,
          transmissions,
          opts.isHighFidelity,
          opts.tags,
          opts.zineOptions?.selectedTreatmentId,
          fragmentIds,
          usedContextSnapshots,
          opts.lineage,
        );
        if (fragmentIds.length > 0) {
          clearApprovedUsedContext("studio");
        }
        navigate("/zine/" + id);
        setZineMetadata({
          id,
          userId: targetUid,
          userHandle: profile?.handle || "Ghost",
          title: result.content.title,
          tone,
          timestamp: Date.now(),
          likes: 0,
          content: result.content,
          coverImageUrl: coverUrl || null,
          artifacts: media,
          originalInput: text,
          transmissionsUsed: transmissions,
          isHighFidelity: opts.isHighFidelity,
          isQuickPreview: opts.isQuickPreview,
          imageEnhancement: opts.zineOptions?.imageEnhancement,
          imageFilter: opts.zineOptions?.imageFilter,
          treatmentId: opts.zineOptions?.selectedTreatmentId,
          lineage: opts.lineage?.length ? opts.lineage : undefined,
          tags: opts.tags && opts.tags.length > 0 ? opts.tags : undefined,
          fragmentsUsed: fragmentIds,
          usedContextSnapshots:
            usedContextSnapshots.length > 0 ? usedContextSnapshots : undefined,
          editorialCompileMarkdown: editorialCompile?.markdown,
          editorialCompileCompiledAt: editorialCompile?.compiledAt,
          createdAt: Date.now(),
          theme: opts.zineOptions?.theme || "Editorial Stillness",
          aestheticVector: {},
        });
        window.dispatchEvent(
          new CustomEvent("mimi:sound", { detail: { type: "success" } }),
        );
        setAppState(AppState.REVEALED);
      } catch (e) {
        console.error("MIMI // Zine Creation Failed:", e);
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Oracle Disconnected. Please try again.",
              type: "error",
            },
          }),
        );
        setAppState(AppState.IDLE);
      }
    },
    [user, profile, activePersona, canGenerate, incrementGeneration],
  );

  useEffect(() => {
    const handleDevelopHighFi = (e: any) => {
      const originalInput = e.detail?.originalInput;
      if (originalInput) {
        handleRefine(originalInput, [], "CONTENT", {
          isHighFidelity: true,
          isLite: false,
          isQuickPreview: false,
        });
      }
    };
    window.addEventListener("mimi:develop_highfi", handleDevelopHighFi);
    return () => window.removeEventListener("mimi:develop_highfi", handleDevelopHighFi);
  }, [handleRefine]);

  if (isDatabaseMissing) return <DatabaseVoid />;

  if (window.location.pathname.startsWith("/auth/action")) {
    return <AuthAction />;
  }

  if (window.location.pathname.startsWith("/s/")) {
    const shareId = window.location.pathname.split("/s/")[1];
    return <PublicZineSharePage zineId={shareId} />;
  }

  if (window.location.pathname.startsWith("/@")) {
    return <PublicSharePage />;
  }

  if (window.location.pathname === "/showcase") {
    return <MimiShowcaseDirectory navigate={navigate} />;
  }

  if (
    window.location.pathname.startsWith("/u/") &&
    window.location.pathname.endsWith("/dna")
  ) {
    const handle = window.location.pathname.split("/u/")[1].split("/dna")[0];
    return <PublicDnaBadge handle={handle} />;
  }

  if (window.location.pathname.startsWith("/u/") && !window.location.pathname.endsWith("/dna")) {
    const handle = window.location.pathname.split("/u/")[1]?.split("/")[0];
    if (handle) {
      return <MimiYouPublicRoute handle={handle} navigate={navigate} />;
    }
  }

  if (window.location.pathname.startsWith("/stacks/")) {
    const stackId = window.location.pathname.split("/stacks/")[1];
    return <StackView stackId={stackId} />;
  }

  if (
    window.location.pathname === "/privacy" ||
    window.location.pathname === "/terms"
  ) {
    const type = window.location.pathname === "/privacy" ? "privacy" : "terms";
    return (
      <>
        <LegalDocumentPage type={type} />
        <CookieConsentBanner />
      </>
    );
  }

  if (isPatronMint) {
    return <PatronMintView onExit={() => setIsPatronMint(false)} />;
  }

  const viewModeTitles: Record<string, string> = {
    "editorial-home": "Mimi Front Page",
    "the-press": "The Press",
    "the-edit": "The Edit",
    studio: "The Worktable",
    moodboard: "Mood Board",
    pocket: "Pocket Registry",
    darkroom: "Darkroom",
    "private-studio": "Private Studio",
    "mimi-dolls": "Mimi Dolls",
    "mimi-drop": "The Drop",
    tailor: "The Tailor",
    "brand-intake": "Mimi Report",
    thimble: "Thimble",
    oracle: "Oracle",
    scribe: "Scribe",
    geo_engine: "GEO Engine",
    signature: "The Signature",
    "art-style": "Art Style Scryer",
    archival: "Archive",
    profile: "Profile",
    "intel-hub": "Aesthetic Intelligence Hub",
    threads: "Threads",
    nebula: "Floor",
    codex: "System",
    scry: "Scry",
    proscenium: "Proscenium",
    sanctuary: "Sanctuary",
    ward: "The Ward",
    signals: "Thimble Index",
    "narrative-threads": "Narrative Threads",
    "taste-graph": "Taste Graph",
    "latent-constellation": "Latent Constellation",
    "the-lens": "The Lens",
    notifications: "Registry Updates",
    wardrobe: "Wardrobe",
    "action-board": "Action Board",
    loom: "The Loom",
    "taste-identity": "Taste Identity",
    "taste-discovery": "Taste Discovery",
    architecture: "System Architecture",
    "chamber-map": "Chamber Registry",
  };

  const currentTitle = viewModeTitles[viewMode] || "Studio View";

  const getChamber = (mode: string) => {
    if (["studio", "moodboard", "darkroom", "private-studio"].includes(mode)) return "create";
    if (
      [
        "oracle",
        "geo_engine",
        "thimble",
        "archival",
        "threads",
        "latent-constellation",
        "the-lens",
      ].includes(mode)
    )
      return "reflect";
    if (["tailor", "loom", "action-board", "the-edit", "the-press", "wardrobe", "mimi-drop"].includes(mode))
      return "refine";
    if (["signature", "ward", "profile", "taste-graph", "pocket", "scribe", "mimi-dolls"].includes(mode))
      return "signature";
    if (["nebula", "proscenium"].includes(mode)) return "observe";
    return "system";
  };

  const chamber = getChamber(viewMode);

  const ChamberOverlay = ({ chamber }: { chamber: string }) => {
    if (chamber === "reflect") {
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0 mix-blend-overlay" />
      );
    }
    if (chamber === "refine") {
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] z-0 mix-blend-overlay" />
      );
    }
    if (chamber === "signature") {
      return (
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] z-0 mix-blend-overlay" />
      );
    }
    return null;
  };

  return (
    <IntelligenceGateContext.Provider value={gateValue}>
      <div className="h-full w-full bg-nous-base text-nous-text transition-colors duration-500 flex flex-col relative overflow-hidden">
      <AnimatePresence>
        {(authLoading || isElevatorLoading) && (
          <ElevatorLoader
            minDuration={1000}
            authLoading={authLoading}
            onComplete={() => setElevatorLoading(false)}
            onBypass={() => {
              setElevatorLoading(false);
              forceBypassAuth();
            }}
          />
        )}
      </AnimatePresence>

      {!authLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
        >
          <OfflineBanner />
      <KeyBlockedBanner />
      {/* Subtle Texture Overlay Removed for clarity */}
      {isCRTEnabled && (
        <>
          <div className="crt-overlay crt-flicker-anim pointer-events-none" />
          <div className="grain-overlay pointer-events-none" />
        </>
      )}

      <AnimatePresence>
        {scribeTab && (
          <TheScribe
            key={scribeTab}
            initialTab={scribeTab as "mimi" | "cyrus" | "engine" | "synthesis"}
            initialIntent={scribeContext?.intent}
            onClose={() => {
              setScribeTab(null);
              setScribeContext(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCaptiveSentinel && (
          <CaptiveSentinel onClose={() => setShowCaptiveSentinel(false)} />
        )}
      </AnimatePresence>

      <MimiGateway isOpen={showGateway} onClose={() => setShowGateway(false)} />
      <ApiKeyShield isOpen={!memoizedHasApiKey} onClose={() => {}} />

      <RegistryAlert />
      {viewMode !== "studio" && import.meta.env.DEV && <ClinicalAuditDrawer />}
      <AnimatePresence>
        {showPatronModal && (
          <ImperialPatronageModal
            isOpen={showPatronModal}
            onClose={() => setShowPatronModal(false)}
            isLimitReached={!canGenerate}
          />
        )}
      </AnimatePresence>
      <Suspense fallback={null}>
        <MobileProfileModal
          isOpen={isMobileProfileOpen}
          onClose={() => setIsMobileProfileOpen(false)}
          onOpenSettings={() => {
            setIsMobileProfileOpen(false);
            setViewMode("profile");
          }}
        />
      </Suspense>

      {showNotifications && (
        <div className="fixed top-16 right-4 z-[100]">
          <NotificationsPanel />
        </div>
      )}

      {/* Header */}
      {appState !== AppState.REVEALED && viewMode !== "studio" && (
        <StudioChrome
          theme={currentPalette.isDark ? "dark" : "light"}
          onToggleTheme={toggleMode}
          onOpenMenu={() => setIsNavOpen(true)}
          viewMode={viewMode}
          isGenerating={appState === AppState.THINKING}
          isHighLatency={(systemStatus?.latency ?? 0) > 250 || systemStatus?.oracle === 'saturated'}
        />
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Dark Spine Sidebar */}
        {appState !== AppState.REVEALED && (
          <button
            type="button"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-expanded={isNavOpen}
            aria-label="Toggle Mimi Canon Menu"
            title="Toggle Mimi Canon Menu"
            className="w-16 bg-nous-text flex flex-col items-center py-6 border-r border-nous-border relative z-20 hidden md:flex cursor-pointer hover:bg-nous-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 text-left"
          >
            {/* Elegant Vertical Sidebar Content */}
            <div className="flex flex-col items-center justify-between h-full select-none w-full relative z-10 text-stone-300 pointer-events-none">
              {/* Top Menu Icon Button */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <div className="w-8 h-8 rounded-full border border-stone-850 flex items-center justify-center bg-[#1c1c1a]/50 text-amber-500 animate-pulse">
                  <LayoutGrid size={14} strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-black">MENU</span>
              </div>

              {/* Center vertical typography (Spaced label) */}
              <div className="flex-1 flex items-center justify-center py-8">
                <p 
                  style={{ writingMode: "vertical-rl" }} 
                  className="font-mono text-[8px] uppercase tracking-[0.55em] font-extrabold text-stone-500 hover:text-stone-300 transition-colors rotate-180 select-none whitespace-nowrap"
                >
                  ✥ MIMI CANON SYSTEM
                </p>
              </div>

              {/* Bottom status indicator / coordinates */}
              <div className="flex flex-col items-center gap-1 font-mono text-[7px] text-stone-500 mb-2">
                <span>E: 0.88</span>
                <span className="text-[9px] text-amber-500">✥</span>
              </div>
            </div>

            {/* Tactile Punch Circles directly on the side component */}
            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-around py-12 pointer-events-none z-20">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-stone-950 dark:bg-black border border-stone-800 dark:border-stone-900 shadow-inner flex items-center justify-center"
                >
                  <div className="w-1 h-1 rounded-full bg-stone-900 dark:bg-stone-950" />
                </div>
              ))}
            </div>
          </button>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 flex flex-col relative ${
            ["studio", "taste-graph", "taste-discovery", "the-edit", "tailor", "moodboard", "darkroom", "private-studio", "quiet-studio"].includes(viewMode)
              ? "overflow-hidden min-h-0 pb-0 h-full"
              : "overflow-y-auto bg-nous-base pb-[72px] md:pb-0"
          }`}
        >
          {profile?.geoProfile?.driftAlert && !isDriftDismissed && (
            <div className="w-full bg-[#1A1A1A] text-[#F5F5F0] border-b border-[#333333] px-6 py-3 flex items-center justify-between z-40 relative">
              <div className="flex items-center gap-3">
                <Sparkles
                  size={16}
                  className="text-nous-subtle animate-pulse"
                />
                <p className="font-mono text-[10px] uppercase tracking-widest font-black">
                  Your taste signal may have evolved. Regenerate your GEO Pack
                  to stay current.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRegenerateGeoPack}
                  disabled={isRegeneratingDrift}
                  className="font-mono text-[9px] uppercase tracking-widest font-bold border border-nous-subtle px-3 py-1 hover:bg-nous-text hover:text-nous-base transition-colors disabled:opacity-50"
                >
                  {isRegeneratingDrift ? "Neutralizing..." : "Regenerate"}
                </button>
                <button
                  onClick={() => setIsDriftDismissed(true)}
                  className="text-nous-subtle hover:text-nous-border"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <CommandDrawer
            isOpen={commandDrawerOpen}
            onClose={() => setCommandDrawerOpen(false)}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              className={`flex-1 w-full relative ${
                viewMode === "studio" ? "h-full min-h-0" : "h-full min-h-0 overflow-y-auto"
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <ChamberOverlay chamber={chamber} />
              <AnimatePresence>
                {appState === AppState.THINKING && (
                  <ElevatorLoader
                    isDeep={isDeepRefraction}
                    loadingMessage={loadingMessage}
                  />
                )}
              </AnimatePresence>
              <Suspense fallback={<ViewSkeleton />}>
                {appState === AppState.REVEALED && zineMetadata ? (
                  <AnalysisDisplay
                    metadata={zineMetadata}
                    onReset={() => {
                      navigate("/studio");
                      setZineMetadata(null);
                      setAppState(AppState.IDLE);
                    }}
                    onUpdateMetadata={(updated) => {
                      setZineMetadata(updated);
                      updateZineMetadata(updated).catch(console.error);
                    }}
                    onExtractTailorLogic={(logic) => {
                      setTailorOverrides(logic);
                      setViewMode("tailor");
                      setAppState(AppState.IDLE);
                      setZineMetadata(null);
                    }}
                  />
                ) : (
                  <>
                    {viewMode === "studio" && (
                      <InputStudio
                        onRefine={handleRefine}
                        isThinking={appState === AppState.THINKING}
                        initialValue={threadValue}
                        initialMedia={threadMedia}
                        initialHighFidelity={threadHighFidelity}
                        zineOptions={zineOptions}
                        setZineOptions={setZineOptions}
                      />
                    )}
                    {viewMode !== "studio" && (
                      <>
                        {viewMode === "oracle" && <TheOracle />}
                        {viewMode === "nebula" && (
                          <ArchiveCloudNebula
                            onSelectZine={(z) => {
                              navigate("/zine/" + z.id);
                              setZineMetadata(z);
                              setAppState(AppState.REVEALED);
                            }}
                            onGenerateThreadZine={handleGenerateThreadZine}
                          />
                        )}
                        {viewMode === "archival" && (
                          <ArchivalView
                            onSelectZine={(z) => {
                              navigate("/zine/" + z.id);
                              setZineMetadata(z);
                              setAppState(AppState.REVEALED);
                            }}
                          />
                        )}
                        {viewMode === "memberships" && (
                           <SubscriptionMatrix />
                        )}
                        {viewMode === "editorial-home" && (
                          <EditorialFrontPage
                            onSelectZine={(id) => {
                              navigate("/zine/" + id);
                            }}
                            onOpenGateway={() => setShowGateway(true)}
                          />
                        )}
                        {viewMode === "the-press" && <ThePressChamber />}
                        {viewMode === "pocket" && (
                          <Pocket
                            onSelectZine={(z) => {
                              navigate("/zine/" + z.id);
                              setZineMetadata(z);
                              setAppState(AppState.REVEALED);
                            }}
                          />
                        )}
                        {viewMode === "profile" && <UserProfileView />}
                        {viewMode === "ui-audit" && <UIAuditView />}
                        {viewMode === "signature" && <SignatureView />}
                        {viewMode === "tailor" && (
                          <TailorView
                            initialOverrides={tailorOverrides}
                            onOverridesConsumed={() => setTailorOverrides(null)}
                            navigate={navigate}
                            initialPanel={tailorPanel}
                          />
                        )}
                        {viewMode === "wardrobe" && <WardrobeView />}
                        {viewMode === "scry" && <ScryView />}
                        {viewMode === "the-edit" && <TheEditChamber />}
                        {viewMode === "briefs" && <BriefCalibrationChamber />}
                        {viewMode === "mimi-drop" && <MimiDrop />}
                        {viewMode === "proscenium" && (
                          <ProsceniumView
                            onSelectZine={(z) => {
                              navigate("/zine/" + z.id);
                              setZineMetadata(z);
                              setAppState(AppState.REVEALED);
                            }}
                          />
                        )}
                        {viewMode === "darkroom" && <DarkroomView />}
                        {viewMode === "sanctuary" && <SanctuaryView />}
                        {viewMode === "ward" && (
                          <TheWard onClose={() => setViewMode("studio")} />
                        )}
                        {viewMode === "private-studio" && (
                          <PrivateStudioChamber onClose={() => setViewMode("studio")} />
                        )}
                        {viewMode === "quiet-studio" && <QuietStudioView />}
                        {viewMode === "moodboard" && <MoodBoardChamber />}
                        {viewMode === "thimble" && <ThimbleDashboard />}
                        {viewMode === "loom" && <StrategyStudio />}
                        {viewMode === "action-board" && <ActionBoard />}
                        {viewMode === "taste-identity" && (
                          <TransformationPathView />
                        )}
                        {viewMode === "taste-discovery" && (
                          <TasteDiscoveryView />
                        )}
                        {viewMode === "signals" && <ThimbleIndex />}
                        {viewMode === "threads" && <ScribeChamber initialTab="threads" />}
                        {viewMode === "narrative-threads" && (
                          <ScribeChamber initialTab="threads" />
                        )}
                        {viewMode === "taste-graph" && <TasteGraph />}
                        {viewMode === "latent-constellation" && (
                          <LatentConstellation />
                        )}
                        {viewMode === "the-lens" && <TheLens />}
                        {viewMode === "obsidian-mirror" && <ObsidianMirror />}
                        {viewMode === "notifications" && <NotificationsView />}
                        {viewMode === "codex" && <CodexView />}
                        {viewMode === "brand-voice" && <BrandVoiceView />}
                        {viewMode === "architecture" && <ArchitectureView />}
                        {viewMode === "aesthetic-tokens" && (
                          <AestheticTokensMap
                            onClose={() => setViewMode("studio")}
                          />
                        )}
                        {viewMode === "syllabus" && (
                          <NousReadingList
                            onClose={() => setViewMode("studio")}
                          />
                        )}
                        {viewMode === "brand-intake" && <BrandIntakeView />}
                        {viewMode === "intel-hub" && <IntelHub />}
                        {viewMode === "forecast" && <TheForecast />}
                        {viewMode === "qc_engine" && <ColorQCEngine />}
                        {viewMode === "scribe" && <ScribeChamber />}
                        {viewMode === "mimi-dolls" && (
                          <MimiDollsChamber navigate={navigate} />
                        )}
                        {viewMode === "chamber-map" && (
                          <ChamberMapView onNavigate={setViewMode} />
                        )}
                        {viewMode === "geo_engine" && (
                          <div className="h-full w-full overflow-y-auto">
                            <TheGEOEngine />
                          </div>
                        )}
                        {viewMode === "manifesto" && <CommunityManifesto />}
                        {viewMode === "checkout-success" && checkoutPlan && (
                          <CheckoutSuccessView
                            plan={checkoutPlan}
                            interval={checkoutInterval}
                            onContinue={() => setViewMode("studio")}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
          {viewMode !== "studio" && (
            <MobileNavigation
              currentView={viewMode}
              setViewMode={setViewMode}
              profile={profile}
              isGenerating={appState === AppState.THINKING}
            />
          )}
          <SelectionMemoryCapture />
          <CookieConsentBanner />
        </main>
      </div>

      {/* GLOBAL RESPONSIVE RIGHT-SIDE SLIDING DRAWER MENU */}
      <NavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        logout={logout}
        profile={profile}
        systemStatus={systemStatus}
        setUiMode={setUiMode}
        onOpenGuide={() => setIsGuideOpen(true)}
        isGenerating={appState === AppState.THINKING}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
        </motion.div>
      )}
      </div>
    </IntelligenceGateContext.Provider>
  );
};
