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
import { RipPublicRoute } from "./components/RipPublicRoute";
import { RipLandingPage } from "./components/RipLandingPage";
import { FishLandingPage } from "./components/FishLandingPage";
import { FishShelfPage } from "./components/FishShelfPage";
import { MimiShowcaseDirectory } from "./components/MimiShowcaseDirectory";
import {
  getSiteSkin,
  parseFishShelfHandle,
  parseFishShareId,
  parseRipPublicHandle,
} from "./lib/siteHost";
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
import { getEditorialCompileExport } from "./lib/editCompileExport";
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
import { StudioWorktable } from "./components/worktable/StudioWorktable";
import { StudioChrome } from "./components/studio/StudioChrome";
import {
  MessyPocketStash,
  POCKET_STASH_CLOSE_EVENT,
  POCKET_STASH_OPEN_EVENT,
  POCKET_STASH_TOGGLE_EVENT,
} from "./components/pocket/MessyPocketStash";
import { injectJSONLD } from "./utils/seoHelper";
import { archiveManager } from "./services/archiveManager";
import { SUPERINTELLIGENCE_PROMPTS } from "./constants";
import { AnalysisDisplay } from "./components/AnalysisDisplay";
import { ElevatorLoader } from "./components/ElevatorLoader";
import { AppShell } from "./components/system/AppShell";
import { ChamberSkeleton } from "./components/system/ChamberSkeleton";
import { SurveillanceOverlay } from "./components/system/SurveillanceOverlay";
import { Wayfinder } from "./components/navigation/Wayfinder";
import { UserProvider, useUser } from "./contexts/UserContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AgentProvider, useAgents } from "./contexts/AgentContext";
import { MENU_STRUCTURE } from "./components/navigationConfig";
import { canonicalizeMimiRoute } from "./lib/productCanon";
import { LegalDocumentPage } from "./components/LegalDocumentPage";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { legalTypeFromPath } from "./lib/legalContent";
import { useTactileAudio } from "./hooks/useTactileAudio";
import { useChamber } from "./hooks/useChamber";

// Lazy load views to reduce initial request count and prevent 429 errors
import { MobileProfileModal } from "./components/MobileProfileModal";
const ArchiveCloudNebula = lazy(
  () => import("./components/ArchiveCloudNebula"),
);
const TheStand = lazy(() =>
  import("./components/TheStand").then((m) => ({ default: m.TheStand })),
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
import { CoreLoopOnboarding } from "./components/CoreLoopOnboarding";
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
const RipChamber = lazy(() =>
  import("./components/chambers/RipChamber").then((m) => ({ default: m.RipChamber })),
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
const AtelierChamber = lazy(() =>
  import("./components/chambers/AtelierChamber").then((m) => ({ default: m.AtelierChamber })),
);
const HouseChamber = lazy(() =>
  import("./components/chambers/HouseChamber").then((m) => ({ default: m.HouseChamber })),
);
const ResidueChamber = lazy(() =>
  import("./components/chambers/ResidueChamber").then((m) => ({ default: m.ResidueChamber })),
);
const ObservatoryChamber = lazy(() =>
  import("./components/chambers/ObservatoryChamber").then((m) => ({
    default: m.ObservatoryChamber,
  })),
);
const CelestialCalibrationChamber = lazy(() =>
  import("./components/chambers/CelestialCalibrationChamber").then((m) => ({
    default: m.CelestialCalibrationChamber,
  })),
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
            <div className="px-6 py-5 border-b studio-border flex items-start justify-between studio-bg-surface select-none">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] font-bold leading-none studio-text-muted">
                  Full Menu
                </span>
                <span className="font-serif italic text-2xl leading-tight studio-text-ink mt-1.5">
                  All chambers
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 border studio-border flex items-center justify-center studio-text-muted hover:studio-text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
                title="Close Menu"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <Wayfinder
              viewMode={viewMode}
              onNavigate={handleNav}
              disabled={isGenerating}
            />

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
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-neutral-400 dark:text-neutral-500 shrink-0">
                        {section.section}
                      </span>
                      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <AnimatePresence mode="popLayout">
                        {section.items.map((item) => {
                          const currentPath =
                            typeof window !== "undefined"
                              ? window.location.pathname.replace(/\/$/, "") || "/"
                              : "";
                          const isActive = item.mode.includes("/")
                            ? currentPath === `/${item.mode}`
                            : viewMode === canonicalizeMimiRoute(item.mode);
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
                              className={`w-full text-left group flex flex-col gap-1 py-3.5 px-1 min-h-[44px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
                                isActive ? "" : ""
                              }`}
                            >
                              <span
                                className={`flex items-center gap-2 font-mono text-[15px] uppercase tracking-[0.18em] font-bold transition-colors ${
                                  isActive
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "studio-text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400"
                                }`}
                              >
                                {isActive ? <span className="text-amber-500 text-xs">✥</span> : null}
                                {item.label}
                              </span>
                              <span className="font-sans text-[13px] leading-snug text-stone-500 dark:text-stone-400">
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

const ROUTE_PERSIST_KEY = "mimi_last_route";

// These are actual in-app pathname segments. A few legacy routes intentionally
// remain snake_case because other app surfaces navigate to /geo_engine and
// /qc_engine directly.
const RESTORABLE_TOP_LEVEL_ROUTES = new Set([
  "action-board",
  "archival",
  "architecture",
  "atelier",
  "house",
  "aesthetic-tokens",
  "brand-intake",
  "brand-voice",
  "briefs",
  "chamber-map",
  "cliques",
  "codex",
  "connections",
  "darkroom",
  "editorial-home",
  "forecast",
  "geo_engine",
  "intel-hub",
  "latent-constellation",
  "loom",
  "manifesto",
  "memberships",
  "mimi-dolls",
  "mimi-rip",
  "mimi-drop",
  "moodboard",
  "nebula",
  "stand",
  "notifications",
  "obsidian-mirror",
  "oracle",
  "pocket",
  "private-studio",
  "profile",
  "proscenium",
  "qc_engine",
  "quiet-studio",
  "residue",
  "observatory",
  "mean-median-mode",
  "celestial-calibration",
  "sanctuary",
  "scribe",
  "scry",
  "signals",
  "signature",
  "studio",
  "syllabus",
  "tailor",
  "taste-discovery",
  "taste-graph",
  "taste-identity",
  "the-edit",
  "the-lens",
  "the-press",
  "thimble",
  "threads",
  "ui-audit",
  "ward",
  "wardrobe",
]);

const RESTORABLE_TAILOR_PANELS = new Set([
  "diagnostics",
  "dossier",
  "evidence",
  "style-lab",
]);

/**
 * Returns the private app route that is safe to persist for cold-launch
 * restoration. Public share, auth, checkout callbacks, legal, malformed, and
 * unknown routes are rejected so a cold launch only resumes supported in-app
 * destinations.
 */
const getRestorableRoute = (candidate: string): string | null => {
  if (!candidate || typeof candidate !== "string") return null;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(candidate, "https://mimi.local");
  } catch {
    return null;
  }

  if (url.origin !== "https://mimi.local") return null;

  const pathname = url.pathname;
  if (!pathname || pathname === "/") return null;

  if (
    pathname.startsWith("/s/") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/stacks/") ||
    pathname.startsWith("/auth/") ||
    legalTypeFromPath(pathname) != null ||
    pathname === "/showcase" ||
    pathname === "/success" ||
    pathname === "/canceled"
  ) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment] = segments;

  if (!firstSegment) return null;

  if (firstSegment === "zine") {
    return segments.length === 2 && secondSegment ? pathname : null;
  }

  if (firstSegment === "tailor") {
    if (segments.length === 1) return pathname;
    return segments.length === 2 &&
      secondSegment &&
      RESTORABLE_TAILOR_PANELS.has(secondSegment)
      ? pathname
      : null;
  }

  if (segments.length !== 1) return null;

  const canonical = canonicalizeMimiRoute(firstSegment);
  return RESTORABLE_TOP_LEVEL_ROUTES.has(canonical) ? `/${canonical}` : null;
};

/**
 * Keeps the in-app URL state in sync with browser history and delays the cold-
 * launch "/" restoration until authentication and redirect/callback handling
 * have settled. That prevents restoring a stale route before auth-driven
 * startup redirects have finished.
 */
const useAppRouter = (authReady: boolean) => {
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

  // Persist the current route for cold-launch restoration (iOS installed PWA
  // always launches from start_url "/", so we restore the user's last private
  // route via localStorage).
  useEffect(() => {
    const restorableRoute = getRestorableRoute(path);
    if (restorableRoute) {
      try {
        localStorage.setItem(ROUTE_PERSIST_KEY, restorableRoute);
      } catch {
        // Expected in Private Browsing mode (SecurityError) or when storage
        // quota is exceeded (QuotaExceededError). Neither case is actionable
        // at runtime, so silently skip persistence.
      }
    }
  }, [path]);

  useEffect(() => {
    if (!authReady) return;
    if (path === "/" || path === "") {
      // Do not redirect while known callback query params are present on the
      // root URL.  Each handler reads window.location.search (or .href);
      // navigating away first would wipe those params before the handler runs:
      //   • checkout=… / plan=… / tier=…  — Stripe checkout return URL
      //   • mode=… / oobCode=… / apiKey=… — Firebase email-link sign-in
      //   • view=patron_mint              — patron-mint overlay
      const params = new URLSearchParams(window.location.search);
      const hasCallbackParam =
        params.has("checkout") ||
        params.has("plan") ||
        params.has("tier") ||
        params.has("mode") ||
        params.has("oobCode") ||
        params.has("apiKey") ||
        params.has("view");
      if (hasCallbackParam) return;
      // Attempt to restore the last private route on cold launch.
      let restoredPath = "/studio";
      try {
        const saved = localStorage.getItem(ROUTE_PERSIST_KEY);
        const restorableRoute = saved ? getRestorableRoute(saved) : null;
        if (restorableRoute) {
          restoredPath = restorableRoute;
        }
      } catch {
        // Expected in Private Browsing mode (SecurityError) or on quota
        // exceeded (QuotaExceededError). Fall back to the default destination.
      }
      if (restoredPath !== path) {
        navigate(restoredPath, { replace: true });
      }
    }
  }, [authReady, navigate, path]);

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

  public setProvider(provider: "gemini" | "openai" | "anthropic" | "gateway") {
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
    isSimulatedMode,
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
  const { path, navigate } = useAppRouter(!authLoading);
  const pathParts = path.split("/").filter(Boolean);
  const isZineRoute = pathParts[0] === "zine" && pathParts[1];
  const urlZineId = isZineRoute ? pathParts[1] : null;
  const houseIssueId =
    pathParts[0] === "house" && pathParts[1] === "issue" && pathParts[2]
      ? pathParts[2]
      : null;
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
          : pathParts[1] === "evidence" || pathParts[1] === "intake"
            ? "intake"
            : pathParts[1] === "style-lab"
              ? "style-lab"
              : pathParts[1] === "diagnostics"
                ? "diagnostics"
                : pathParts[1] === "blueprint"
                  ? "blueprint"
                  : "intake"; // Evidence Intake is Tailor step 0

  useEffect(() => {
    if (isLegacyStyleLabRoute) {
      navigate("/tailor/style-lab", { replace: true });
    } else if (isLegacyDiagnosticsRoute) {
      navigate("/tailor/diagnostics", { replace: true });
    } else if (viewMode === "tailor" && !pathParts[1]) {
      // Evidence Intake is the default Tailor entry (step 0).
      navigate("/tailor/evidence", { replace: true });
    } else if (
      rawViewMode === "connections" ||
      rawViewMode === "correspondents"
    ) {
      // Connections chamber lives on The Proscenium.
      navigate("/proscenium/correspondents", { replace: true });
    } else if (rawViewMode === "cliques" || rawViewMode === "clique") {
      navigate("/proscenium/cliques", { replace: true });
    }
  }, [
    isLegacyDiagnosticsRoute,
    isLegacyStyleLabRoute,
    navigate,
    pathParts[1],
    rawViewMode,
    viewMode,
  ]);

  const prosceniumWing =
    pathParts[1] === "correspondents" ||
    pathParts[1] === "connections" ||
    pathParts[1] === "circle"
      ? ("correspondents" as const)
      : pathParts[1] === "cliques" || pathParts[1] === "clique"
        ? ("cliques" as const)
        : ("stage" as const);

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
      if (mode === "connections" || mode === "correspondents") {
        navigate("/proscenium/correspondents");
        return;
      }
      if (mode === "cliques" || mode === "clique") {
        navigate("/proscenium/cliques");
        return;
      }
      // Nested chamber paths (e.g. tailor/evidence) skip alias flattening.
      if (mode.includes("/")) {
        navigate(`/${mode.replace(/^\//, "")}`);
        return;
      }
      const normalizedMode = canonicalizeMimiRoute(mode);
      // mimi.you alias opens the private universe hub; mimi-dolls stays shell-first.
      if (mode === "mimi-you") {
        navigate("/mimi-dolls/overview");
        return;
      }
      if (normalizedMode === "mimi-dolls") {
        navigate("/mimi-dolls");
        return;
      }
      if (normalizedMode === "mimi-rip" || normalizedMode === "rip") {
        navigate("/rip");
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
  const [pocketStashOpen, setPocketStashOpen] = useState(false);
  const isStandalonePwaShell = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const inStandaloneDisplayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const isLegacyIosStandalone = (window.navigator as any)?.standalone === true;
    return Boolean(inStandaloneDisplayMode || isLegacyIosStandalone);
  }, []);
  const pocketDragDepth = useRef(0);

  useEffect(() => {
    const onToggle = () => setPocketStashOpen((v) => !v);
    const onOpen = () => setPocketStashOpen(true);
    const onClose = () => setPocketStashOpen(false);
    window.addEventListener(POCKET_STASH_TOGGLE_EVENT, onToggle);
    window.addEventListener(POCKET_STASH_OPEN_EVENT, onOpen);
    window.addEventListener(POCKET_STASH_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(POCKET_STASH_TOGGLE_EVENT, onToggle);
      window.removeEventListener(POCKET_STASH_OPEN_EVENT, onOpen);
      window.removeEventListener(POCKET_STASH_CLOSE_EVENT, onClose);
    };
  }, []);

  const isExternalPocketDrag = (e: DragEvent) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    const list = Array.from(types);
    // Internal HTML5 drags (page reorder, pocket insert, etc.) often set text/plain
    // and/or application/mimi-* — never treat those as "open the stash" signals.
    if (list.some((t) => t.startsWith("application/mimi-"))) return false;
    // File drops and external URL drags are the intended open triggers.
    // Bare text/plain alone is too common for in-app reorder/edit drags.
    return list.includes("Files") || list.includes("text/uri-list");
  };

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!isExternalPocketDrag(e)) return;
      e.preventDefault();
      pocketDragDepth.current += 1;
      setPocketStashOpen(true);
      window.dispatchEvent(new CustomEvent(POCKET_STASH_OPEN_EVENT));
    };
    const onDragOver = (e: DragEvent) => {
      if (!isExternalPocketDrag(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!isExternalPocketDrag(e)) return;
      pocketDragDepth.current = Math.max(0, pocketDragDepth.current - 1);
    };
    const onDrop = (e: DragEvent) => {
      // Always reset depth; only intercept browser navigation for external drops.
      pocketDragDepth.current = 0;
      if (!isExternalPocketDrag(e)) return;
      e.preventDefault();
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

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
  /** Escape hatch: dense InputStudio console under Hub worktable */
  const [studioConsoleOpen, setStudioConsoleOpen] = useState(false);

  useEffect(() => {
    if (viewMode !== "studio") setStudioConsoleOpen(false);
  }, [viewMode]);
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
      // Quiet return to patronage — no alert; user can re-pick a plan.
      setViewMode("memberships");
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
    async (text: string, media: any, tone: any, opts: any) => {
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

        if (coverUrl) {
          result.content.meta.originalCoverImageUrl =
            result.content.meta.originalCoverImageUrl || coverUrl;
        }

        if (opts.studioCoverOverlays?.length) {
          result.content.meta = result.content.meta || {};
          result.content.meta.studioCoverOverlays = opts.studioCoverOverlays;
        }

        if (opts.studioCoverVariants?.length) {
          result.content.meta = result.content.meta || {};
          result.content.meta.studioCoverVariants = opts.studioCoverVariants;
        }

        if (coverUrl && opts.studioCoverOverlays?.length) {
          const { resolveExportCoverUrl } = await import("./lib/studioCoverExport");
          coverUrl =
            (await resolveExportCoverUrl(coverUrl, opts.studioCoverOverlays)) ?? coverUrl;
        }

        // Hi-fi issues pre-develop cover + plates before save so reveal opens finished.
        const targetUidForBake = profile?.uid || user?.uid || "ghost";
        if (opts.isHighFidelity && !opts.isLite && !opts.isQuickPreview) {
          try {
            const { bakeZineVisualPlates } = await import("./lib/bakeZinePlates");
            window.dispatchEvent(
              new CustomEvent("mimi:registry_alert", {
                detail: { message: "Developing hi-fi plates for this issue…" },
              }),
            );
            const baked = await bakeZineVisualPlates({
              content: result.content,
              profile,
              apiKey: personaKey,
              artifacts: media,
              treatmentId: opts.zineOptions?.selectedTreatmentId,
              isLite: opts.isLite,
              isHighFidelity: opts.isHighFidelity,
              isQuickPreview: opts.isQuickPreview,
              existingCoverUrl: coverUrl,
              ownerUid: targetUidForBake === "ghost" ? undefined : targetUidForBake,
              issuePlan: result.issuePlan,
            });
            result.content = baked.content;
            if (baked.coverUrl) coverUrl = baked.coverUrl;
            if (baked.failures.length) {
              console.warn("MIMI // Hi-fi plate bake partial failures:", baked.failures);
            }
          } catch (bakeError) {
            console.warn("MIMI // Hi-fi plate bake skipped:", bakeError);
          }
        }

        let cost = 2; // Default for full zine
        if (opts.isLite) cost = 1;
        if (opts.isHighFidelity || opts.deepThinking) cost = 3;

        await incrementGeneration(cost);
        const targetUid = profile?.uid || user?.uid || "ghost";
        const editorialCompile = getEditorialCompileExport(targetUid, true);
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
          clearApprovedUsedContext("studio", targetUid);
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
        const message = e instanceof Error ? e.message : String(e);
        const alreadyRefracted =
          /Semantic Mirror|Aesthetic Refraction|Gateway|credits/i.test(message);
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: alreadyRefracted
                ? "Oracle could not finish saving this refraction. Your draft may still be recoverable — try again or check connection."
                : "Oracle Disconnected. Please try again.",
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

  // mimi.rip / mimi.fish host skins (or ?skin=rip|fish)
  const siteSkin = getSiteSkin();
  if (siteSkin === "rip") {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      return <RipLandingPage navigate={navigate} />;
    }
    const ripHandle = parseRipPublicHandle(path);
    if (ripHandle) {
      return <RipPublicRoute handle={ripHandle} navigate={navigate} />;
    }
    // /rip chamber and other app routes fall through on rip host
  }

  if (siteSkin === "fish") {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      return <FishLandingPage navigate={navigate} />;
    }
    // /s/:id already handled above; map /zine/:id onto the public share plate
    const fishShareId = parseFishShareId(path);
    if (fishShareId && path.startsWith("/zine/")) {
      return <PublicZineSharePage zineId={fishShareId} />;
    }
    const fishHandle = parseFishShelfHandle(path);
    if (fishHandle) {
      return <FishShelfPage handle={fishHandle} navigate={navigate} />;
    }
  }

  if (
    window.location.pathname.startsWith("/u/") &&
    window.location.pathname.endsWith("/dna")
  ) {
    const handle = window.location.pathname.split("/u/")[1].split("/dna")[0];
    return <PublicDnaBadge handle={handle} />;
  }

  // Keep Tabs RSS — if the SPA ever receives feed.xml, bounce to the API handler.
  if (/^\/u\/[^/]+\/feed\.xml$/i.test(window.location.pathname)) {
    const feedHandle = window.location.pathname.split("/u/")[1]?.split("/")[0];
    if (feedHandle) {
      window.location.replace(`/api/feed?handle=${encodeURIComponent(feedHandle)}`);
      return null;
    }
  }

  if (
    window.location.pathname.startsWith("/u/") &&
    !window.location.pathname.endsWith("/dna") &&
    !/^\/u\/[^/]+\/feed\.xml$/i.test(window.location.pathname)
  ) {
    const handle = window.location.pathname.split("/u/")[1]?.split("/")[0];
    if (handle) {
      // Same-host QA: ?skin=rip|fish flips /u/:handle
      if (siteSkin === "rip") {
        return <RipPublicRoute handle={handle} navigate={navigate} />;
      }
      if (siteSkin === "fish") {
        return <FishShelfPage handle={handle} navigate={navigate} />;
      }
      return <MimiYouPublicRoute handle={handle} navigate={navigate} />;
    }
  }

  if (window.location.pathname.startsWith("/stacks/")) {
    const stackId = window.location.pathname.split("/stacks/")[1];
    return <StackView stackId={stackId} />;
  }

  {
    const legalType = legalTypeFromPath(window.location.pathname);
    if (legalType) {
      return (
        <>
          <LegalDocumentPage type={legalType} />
          <CookieConsentBanner />
        </>
      );
    }
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
    "mimi-rip": "mimi.rip",
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
    stand: "The Stand",
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
    "chamber-map": "Studio Map",
    atelier: "Atelier",
    house: "The House",
    residue: "Residue",
    observatory: "The Observatory",
    "mean-median-mode": "Mean Median Mode",
    forecast: "Forecast",
    "celestial-calibration": "Celestial Calibration",
  };

  const currentTitle = viewModeTitles[viewMode] || "Studio View";
  const chamber = useChamber(viewMode);

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
      <CoreLoopOnboarding ready={!authLoading && !isElevatorLoading && !showGateway} />
      <ApiKeyShield isOpen={!memoizedHasApiKey} onClose={() => {}} />

      <RegistryAlert />
      {isSimulatedMode && (
        <div className="px-4 py-2 border-b border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-center">
          Automatic Fallback to Simulated Mode active due to billing/limit. Limiting functions in the Tailor.
        </div>
      )}
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
          onOpenShare={() => {
            try {
              sessionStorage.setItem("mimi:profile_pane", "share");
            } catch {
              /* ignore */
            }
            setIsMobileProfileOpen(false);
            setViewMode("profile");
            window.dispatchEvent(
              new CustomEvent("mimi:profile_pane", { detail: "share" }),
            );
          }}
          onOpenSettings={() => {
            try {
              sessionStorage.setItem("mimi:profile_pane", "settings");
            } catch {
              /* ignore */
            }
            setIsMobileProfileOpen(false);
            setViewMode("profile");
            window.dispatchEvent(
              new CustomEvent("mimi:profile_pane", { detail: "settings" }),
            );
          }}
        />
      </Suspense>

      {showNotifications && (
        <div className="fixed top-16 right-4 z-[100]">
          <NotificationsPanel />
        </div>
      )}

      <MessyPocketStash
        open={pocketStashOpen}
        onClose={() => {
          setPocketStashOpen(false);
          window.dispatchEvent(new CustomEvent(POCKET_STASH_CLOSE_EVENT));
        }}
        onOpenRegistry={() => setViewMode("pocket")}
      />

      <AppShell
        viewMode={viewMode}
        hideBinder={
          appState === AppState.REVEALED || viewMode === "chamber-map"
        }
        menuOpen={isNavOpen}
        onToggleMenu={() => setIsNavOpen(!isNavOpen)}
        chrome={
          appState !== AppState.REVEALED &&
          viewMode !== "studio" &&
          viewMode !== "chamber-map" ? (
            <StudioChrome
              theme={currentPalette.isDark ? "dark" : "light"}
              onToggleTheme={toggleMode}
              onOpenMenu={() => setIsNavOpen(true)}
              viewMode={viewMode}
              isGenerating={appState === AppState.THINKING}
              isHighLatency={(systemStatus?.latency ?? 0) > 250 || systemStatus?.oracle === 'saturated'}
              pocketStashOpen={pocketStashOpen}
            />
          ) : null
        }
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
                viewMode === "studio" || viewMode === "chamber-map"
                  ? "h-full min-h-0"
                  : "h-full min-h-0 overflow-y-auto"
              }`}
              initial={{ opacity: 0, y: isStandalonePwaShell ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isStandalonePwaShell ? 0 : -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <SurveillanceOverlay
                family={chamber.family}
                quiet={chamber.quietChrome}
                voidPlate={chamber.isDarkPlate}
                signalDense={chamber.signalDense}
              />
              <AnimatePresence>
                {appState === AppState.THINKING && (
                  <ElevatorLoader
                    isDeep={isDeepRefraction}
                    loadingMessage={loadingMessage}
                  />
                )}
              </AnimatePresence>
              <Suspense
                fallback={
                  <ChamberSkeleton
                    family={chamber.family}
                    voidPlate={chamber.isDarkPlate}
                    label={chamber.module?.name || currentTitle}
                  />
                }
              >
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
                    {viewMode === "studio" &&
                      (studioConsoleOpen ? (
                        <div className="relative h-full min-h-0 flex flex-col">
                          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)]">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
                              Full console
                            </span>
                            <button
                              type="button"
                              onClick={() => setStudioConsoleOpen(false)}
                              className="min-h-10 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--mimi-ink,#0a0a0a)] border border-[var(--mimi-hairline,#d4d4d4)]"
                            >
                              Back to desk
                            </button>
                          </div>
                          <div className="flex-1 min-h-0">
                            <InputStudio
                              onRefine={handleRefine}
                              isThinking={appState === AppState.THINKING}
                              initialValue={threadValue}
                              initialMedia={threadMedia}
                              initialHighFidelity={threadHighFidelity}
                              zineOptions={zineOptions}
                              setZineOptions={setZineOptions}
                            />
                          </div>
                        </div>
                      ) : (
                        <StudioWorktable
                          onRefine={handleRefine}
                          isThinking={appState === AppState.THINKING}
                          initialValue={threadValue}
                          initialMedia={threadMedia}
                          initialHighFidelity={threadHighFidelity}
                          zineOptions={zineOptions}
                          setZineOptions={setZineOptions}
                          onOpenConsole={() => setStudioConsoleOpen(true)}
                          onOpenMenu={() => setIsNavOpen(true)}
                          onNavigate={setViewMode}
                        />
                      ))}
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
                        {viewMode === "stand" && (
                          <TheStand
                            onSelectZine={(z) => {
                              navigate("/zine/" + z.id);
                              setZineMetadata(z);
                              setAppState(AppState.REVEALED);
                            }}
                          />
                        )}
                        {viewMode === "archival" && (
                          <ArchivalView
                            onSelectZine={(z: any) => {
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
                            initialWing={prosceniumWing}
                            onWingChange={(wing) => {
                              if (wing === "stage") {
                                navigate("/proscenium", { replace: true });
                              } else {
                                navigate(`/proscenium/${wing}`, {
                                  replace: true,
                                });
                              }
                            }}
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
                        {viewMode === "forecast" && (
                          <TheForecast navigate={navigate} />
                        )}
                        {viewMode === "qc_engine" && <ColorQCEngine />}
                        {viewMode === "scribe" && <ScribeChamber />}
                        {viewMode === "mimi-dolls" && (
                          <MimiDollsChamber
                            navigate={navigate}
                            pathSegment={pathParts[1] ?? null}
                          />
                        )}
                        {viewMode === "mimi-rip" && (
                          <RipChamber navigate={navigate} />
                        )}
                        {viewMode === "chamber-map" && (
                          <ChamberMapView
                            onNavigate={setViewMode}
                            onOpenFind={() => setCommandDrawerOpen(true)}
                            onOpenMenu={() => setIsNavOpen(true)}
                          />
                        )}
                        {viewMode === "atelier" && <AtelierChamber />}
                        {viewMode === "house" && (
                          <HouseChamber issueId={houseIssueId} navigate={navigate} />
                        )}
                        {viewMode === "residue" && (
                          <ResidueChamber navigate={navigate} />
                        )}
                        {viewMode === "observatory" && (
                          <ObservatoryChamber navigate={navigate} focus="overview" />
                        )}
                        {viewMode === "mean-median-mode" && (
                          <ObservatoryChamber navigate={navigate} focus="mmm" />
                        )}
                        {viewMode === "celestial-calibration" && (
                          <CelestialCalibrationChamber navigate={navigate} />
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
          <SelectionMemoryCapture />
          <CookieConsentBanner />
      </AppShell>

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
