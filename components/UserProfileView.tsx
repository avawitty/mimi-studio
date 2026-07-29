// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../contexts/UserContext";
import { UserProfile, TypographicArchetype, Persona } from "../types";
import {
  isHandleAvailable,
  fetchUserZines,
  fetchPocketItems,
} from "../services/firebaseUtils";
import {
  Loader2,
  Camera,
  Trash2,
  Download,
  ExternalLink,
  Shield,
  Key,
  Settings,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { useTheme, PALETTES } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "motion/react";
import { DeveloperSettings } from "./DeveloperSettings";
import { KeychainPanel } from "./KeychainPanel";
import { SemanticSteps } from "./SemanticSteps";
import { truncateUid } from "../lib/privacyUtils";
import { TheWard } from "./TheWard";
import { ConnectionsManager } from "./ConnectionsManager";
import { ApiKeyRing } from "./ApiKeyRing";
import { ThePort } from "./ThePort";
import { AddToHomeScreenBanner } from "./AddToHomeScreenBanner";
import { getStoredKey, validateKey, clearKey, storeKey } from "../services/apiKeyService";
import { CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon } from "lucide-react";
import { useIntelligenceGate } from "../App";
import { openBillingPortal } from "../services/stripe";

const detectIframeContext = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const ua = (navigator.userAgent || "").toLowerCase();
  const isSocial =
    /instagram|fb_iab|fban|fbav|tiktok|threads|wv\b|webview/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isSocial && !isStandalone;
};

export const UserProfileView: React.FC = () => {
  const {
    user,
    profile,
    updateProfile,
    logout,
    personas,
    activePersonaId,
    switchPersona,
    createPersona,
    updatePersona,
    deletePersona,
    linkAccount,
    featureFlags,
    loginWithEmail,
  } = useUser();

  const { currentPalette, manifestPalette, applyPalette } = useTheme();

  const [customColors, setCustomColors] = useState({
    base: currentPalette?.base || "#ffffff",
    text: currentPalette?.text || "#000000",
    accent: currentPalette?.accent || "#E5E5E5",
    fontFamily: currentPalette?.fontFamily || "sans",
  });

  const [isIframe, setIsIframe] = useState(false);
  const [handle, setHandle] = useState("");

  const [customFontInput, setCustomFontInput] = useState("");
  const [isFontLoading, setIsFontLoading] = useState(false);

  const injectGoogleFont = (fontName: string) => {
    const linkId = `font-${fontName.replace(/\s+/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@300;400;500;600;700&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
      return true;
    }
    return false;
  };

  const handleFetchFont = () => {
    if (!customFontInput.trim()) return;
    setIsFontLoading(true);
    injectGoogleFont(customFontInput.trim());
    setTimeout(() => {
      setCustomColors((prev) => ({
        ...prev,
        fontFamily: `'${customFontInput.trim()}'`,
      }));
      setCustomFontInput("");
      setIsFontLoading(false);
    }, 500);
  };

  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [genderExpression, setGenderExpression] = useState("");
  const [formerPresentation, setFormerPresentation] = useState("");
  const [externalLinks, setExternalLinks] = useState<
    { title: string; url: string }[]
  >([]);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [showHandleConfirm, setShowHandleConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [archetype, setArchetype] =
    useState<TypographicArchetype>("minimalist-sans");
  const [tasteDefinition, setTasteDefinition] = useState("");

  // Agent Config
  const [curatorEnabled, setCuratorEnabled] = useState(true);
  const [sentinelEnabled, setSentinelEnabled] = useState(true);
  const [curatorBudget, setCuratorBudget] = useState(50);
  const [sentinelBudget, setSentinelBudget] = useState(50);

  // Mask Management
  const [isAddingPersona, setIsAddingPersona] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaKey, setNewPersonaKey] = useState("");
  const [isEditingMask, setIsEditingMask] = useState(false);
  const [editingMaskTemp, setEditingMaskTemp] = useState(0.7);

  const [showWard, setShowWard] = useState(false);
  const [showThePort, setShowThePort] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [profilePane, setProfilePane] = useState<'share' | 'settings'>('share');
  const [isPatronActive, setIsPatronActive] = useState(false);
  const [isBillingPortalLoading, setIsBillingPortalLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { gate } = useIntelligenceGate();
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<'checking' | 'valid' | 'invalid' | 'fallback' | 'unchecked'>('checking');
  const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState("");

  useEffect(() => {
    // Initial fetch from gate validation cache
    const currentStatusObj = gate.getValidationStatus('gemini');
    setGeminiKeyStatus(currentStatusObj.status);
    setGeminiKeyError(currentStatusObj.error || null);

    // Subscribe to real-time status updates from IntelligenceGateService
    const unsubscribe = gate.registerValidationListener((provider, statusObj) => {
      if (provider === 'gemini') {
        setGeminiKeyStatus(statusObj.status);
        setGeminiKeyError(statusObj.error || null);
      }
    });

    // Run active verification on mount to keep in sync
    gate.validateStoredKey('gemini');

    return () => {
      unsubscribe();
    };
  }, [gate]);

  const handleClearAndReconnect = () => {
    clearKey('gemini');
    setIsUpdatingKey(false);
    setNewKeyInput("");
    gate.validateStoredKey('gemini');
  };

  const handleInlineSaveKey = async () => {
    if (!newKeyInput.trim()) return;
    storeKey('gemini', newKeyInput.trim());
    setIsUpdatingKey(false);
    setNewKeyInput("");
    await gate.validateStoredKey('gemini');
  };


  useEffect(() => {
    setIsIframe(detectIframeContext());
  }, []);

  useEffect(() => {
    const paidPlans = new Set([
      "core",
      "pro",
      "lab",
      "initiation",
      "optioning",
      "atelier",
      "sovereign",
    ]);
    const currentPlan = String(
      profile?.membershipPlan || profile?.planStatus || profile?.plan || "",
    ).toLowerCase();
    setIsPatronActive(
      profile?.subscriptionStatus === "active" && paidPlans.has(currentPlan),
    );
  }, [
    profile?.membershipPlan,
    profile?.planStatus,
    profile?.plan,
    profile?.subscriptionStatus,
  ]);

  // Match CreditMeter's isPaid gate so banner and meter never diverge on stale planStatus.
  const PAID_PLAN_STATUSES = new Set([
    "core",
    "pro",
    "lab",
    "initiation",
    "optioning",
    "atelier",
    "sovereign",
  ]);
  const creditMeterIsPaid =
    PAID_PLAN_STATUSES.has(String(profile?.planStatus || "ghost").toLowerCase()) ||
    Boolean(profile?.isPatron);
  const membershipCredits = profile?.membershipCredits;
  const trialCreditsRemaining = profile?.trial?.remainingCredits ?? 0;
  const patronCreditsRemaining = creditMeterIsPaid
    ? Number(membershipCredits?.remaining ?? trialCreditsRemaining)
    : trialCreditsRemaining;
  const patronCreditsAllowance = creditMeterIsPaid
    ? Number(
        membershipCredits?.allowance ??
          membershipCredits?.remaining ??
          profile?.trial?.grantedCredits ??
          0,
      )
    : Number(profile?.trial?.grantedCredits || 12);
  const patronAiCreditsLabel =
    patronCreditsAllowance > 0
      ? `${patronCreditsRemaining.toLocaleString()} / ${patronCreditsAllowance.toLocaleString()}`
      : patronCreditsRemaining > 0
        ? patronCreditsRemaining.toLocaleString()
        : "—";

  const handleOpenBillingPortal = async () => {
    setIsBillingPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Billing portal unavailable.",
        type: "error",
      });
      setIsBillingPortalLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle || "");
      setDisplayName(profile.displayName || "");
      setAvatar(profile.photoURL || null);
      setGenderExpression(profile.genderExpression || "");
      setFormerPresentation(profile.formerPresentation || "");
      setExternalLinks(profile.externalLinks || []);
      setArchetype(
        (profile.tasteProfile
          ?.dominant_archetypes?.[0] as TypographicArchetype) ||
          "minimalist-sans",
      );
      setTasteDefinition(profile.tasteProfile?.inspirations || "");

      if (profile.agentConfig) {
        setCuratorEnabled(profile.agentConfig.curatorEnabled);
        setSentinelEnabled(profile.agentConfig.sentinelEnabled);
        setCuratorBudget(profile.agentConfig.curatorBudget);
        setSentinelBudget(profile.agentConfig.sentinelBudget);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!handle || handle === profile?.handle) {
      setHandleAvailable(true);
      return;
    }
    if (handle.length < 2) {
      setHandleAvailable(null);
      return;
    }
    setIsCheckingHandle(true);
    const timer = setTimeout(async () => {
      const available = await isHandleAvailable(handle, user?.uid || "");
      setHandleAvailable(available);
      setIsCheckingHandle(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [handle, user?.uid, profile?.handle]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const { archiveManager } = await import("../services/archiveManager");
      const url = await archiveManager.uploadMedia(
        user.uid,
        file,
        `avatars/${user.uid}_${Date.now()}`,
      );
      setAvatar(url);
      setIsUploading(false);
    } catch (e) {
      setMessage({ text: "Upload Failed.", type: "error" });
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || isSaving || handleAvailable === false) return;

    if (handle.trim().toLowerCase() !== profile.handle && !showHandleConfirm) {
      setShowHandleConfirm(true);
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        ...profile,
        handle: handle.trim().toLowerCase(),
        displayName: displayName,
        photoURL: avatar,
        genderExpression: genderExpression,
        formerPresentation: formerPresentation,
        externalLinks: externalLinks,
        tasteProfile: {
          ...profile.tasteProfile,
          inspirations: tasteDefinition,
          dominant_archetypes: [archetype],
        },
        agentConfig: {
          curatorEnabled,
          sentinelEnabled,
          curatorBudget,
          sentinelBudget,
        },
      });
      setMessage({ text: "Sovereign Registry Anchored.", type: "success" });
      setShowHandleConfirm(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ text: "Handshake Error.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMask = async () => {
    if (!newPersonaName.trim()) return;
    await createPersona(newPersonaName, newPersonaKey);
    setNewPersonaName("");
    setNewPersonaKey("");
    setIsAddingPersona(false);
    setMessage({ text: "New Mask Minted.", type: "success" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateActiveMask = async () => {
    const activePersona = personas.find((p) => p.id === activePersonaId);
    if (!activePersona) return;
    await updatePersona({
      ...activePersona,
      operationalParameters: {
        ...activePersona.operationalParameters,
        temperature: editingMaskTemp,
      },
    });
    setIsEditingMask(false);
    setMessage({ text: "Mask Parameters Updated.", type: "success" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleGoogleLink = async () => {
    if (user?.isAnonymous) {
      try {
        await linkAccount(false);
      } catch (e: any) {
        setMessage({ text: e.message || "Link Failed.", type: "error" });
      }
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const zines = await fetchUserZines(user.uid);
      const pocket = await fetchPocketItems(user.uid);
      const fullData = {
        profile: profile,
        manifests: zines,
        artifacts: pocket,
        exportDate: new Date().toISOString(),
        version: "Mimi_v4.5",
      };

      const blob = new Blob([JSON.stringify(fullData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mimi_Archive_${handle || "Sovereign"}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage({ text: "Backup Failed.", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const activePersona = personas.find((p) => p.id === activePersonaId);
  const activePersonaIndex = personas.findIndex(
    (p) => p.id === activePersonaId,
  );

  const nextMask = () => {
    if (personas.length === 0) return;
    const nextIndex = (activePersonaIndex + 1) % personas.length;
    switchPersona(personas[nextIndex].id);
  };

  const prevMask = () => {
    if (personas.length === 0) return;
    const prevIndex =
      (activePersonaIndex - 1 + personas.length) % personas.length;
    switchPersona(personas[prevIndex].id);
  };

  if (showThePort) {
    return <ThePort onClose={() => setShowThePort(false)} />;
  }

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar bg-nous-base text-nous-text p-4 md:p-8 mimi-page-pad">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-24 z-[10000] px-8 py-3 rounded-none font-sans text-[10px] uppercase tracking-widest font-black border ${message.type === "success" ? "bg-nous-text text-nous-base border-nous-text " : "bg-red-500 text-white border-red-400"}`}
          >
            {message.text}
          </motion.div>
        )}
        {showDevSettings && (
          <DeveloperSettings onClose={() => setShowDevSettings(false)} />
        )}
        {showWard && <TheWard onClose={() => setShowWard(false)} />}
      </AnimatePresence>

      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-nous-subtle mb-1 block">
            Share Card · Settings
          </span>
          <h1 className="font-serif text-4xl italic">
            Profile
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfilePane('share')}
            className={`px-4 py-2 border font-mono text-[9px] uppercase tracking-widest ${
              profilePane === 'share'
                ? 'border-nous-text text-nous-text bg-nous-base0/40'
                : 'border-nous-border text-nous-subtle'
            }`}
          >
            Share Card
          </button>
          <button
            type="button"
            onClick={() => setProfilePane('settings')}
            className={`px-4 py-2 border font-mono text-[9px] uppercase tracking-widest ${
              profilePane === 'settings'
                ? 'border-nous-text text-nous-text bg-nous-base0/40'
                : 'border-nous-border text-nous-subtle'
            }`}
          >
            Settings
          </button>
        </div>
      </header>

      {profilePane === 'share' && (
        <section className="w-full max-w-3xl mx-auto mb-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-nous-border bg-white dark:bg-nous-base0/20 p-8 md:p-10 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: 'calc(100% / 8) 100%',
              }}
            />
            <div className="relative flex flex-col md:flex-row gap-8 items-start">
              <div className="w-24 h-24 border border-nous-border bg-nous-base shrink-0 overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-nous-subtle">
                    <Camera size={22} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-nous-subtle">
                  {profile?.handle ? `@${profile.handle}` : truncateUid(user?.uid)?.toUpperCase() || 'GUEST'}
                </p>
                <h2 className="font-serif italic text-3xl md:text-4xl text-nous-text leading-none truncate">
                  {profile?.displayName || handle || 'Untitled Curator'}
                </h2>
                <p className="font-sans text-sm text-nous-subtle leading-relaxed max-w-lg">
                  {profile?.tasteProfile?.aestheticSignature?.moodCluster ||
                    profile?.tailorDraft?.strategicSummary?.identityVector ||
                    'Aesthetic intelligence in progress. Publish issues to The Stand to flesh this card.'}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'stand' }))
                    }
                    className="px-4 py-2 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest"
                  >
                    View Stand
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'signature' }))
                    }
                    className="px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text"
                  >
                    Signature
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <main className={`w-full max-w-3xl mx-auto flex flex-col gap-8 pb-20 ${profilePane === 'share' ? 'opacity-90' : ''}`}>
        {/* Clean Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-nous-base rounded-none overflow-hidden border border-nous-border p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-2xl italic">
              Identity & Global Registry
            </h2>
            <Shield size={16} className="text-nous-subtle" />
          </div>

          <div className="mb-8 flex items-center gap-6">
            <div className="relative w-20 h-20 rounded-none overflow-hidden border border-nous-border bg-nous-base flex items-center justify-center shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Camera size={24} className="text-nous-subtle" />
              )}
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
              >
                <Camera size={16} className="text-white" />
              </button>
            </div>
            <div className="flex-grow space-y-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent font-serif text-xl border-b border-nous-border pb-1 focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
                placeholder="Display Name..."
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-2">
              Registry Handle
            </label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-transparent font-mono text-lg border-b border-nous-border pb-1 focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
            />
            {handleAvailable === false && (
              <p className="text-red-500 text-[10px] mt-1">
                Handle unavailable
              </p>
            )}
            {handle && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/u/${handle.trim().toLowerCase()}`;
                }}
                className="mt-3 text-[10px] uppercase tracking-[0.2em] text-nous-subtle hover:text-nous-text border border-nous-border/40 px-4 py-2"
              >
                Open mimi.you (dolls &amp; field notes) →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-2">
                Gender Expression
              </label>
              <input
                value={genderExpression}
                onChange={(e) => setGenderExpression(e.target.value)}
                placeholder="e.g. Fem & Androgynous"
                className="w-full bg-transparent font-sans text-sm border-b border-nous-border pb-1 focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-2">
                Former Presentation History
              </label>
              <input
                value={formerPresentation}
                onChange={(e) => setFormerPresentation(e.target.value)}
                placeholder="e.g. Masculine baseline, structured tailoring"
                className="w-full bg-transparent font-sans text-sm border-b border-nous-border pb-1 focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-4">
              External Resources
            </label>
            <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-2">
              {externalLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-mono border-l-2 border-nous-border pl-3 py-1"
                >
                  <input
                    value={link.url}
                    onChange={(e) => {
                      const newLinks = [...externalLinks];
                      newLinks[i].url = e.target.value;
                      setExternalLinks(newLinks);
                    }}
                    className="bg-transparent w-full focus:outline-none"
                    placeholder="URL..."
                  />
                  <button
                    onClick={() =>
                      setExternalLinks(
                        externalLinks.filter((_, idx) => idx !== i),
                      )
                    }
                    className="text-red-500 ml-2"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setExternalLinks([
                    ...externalLinks,
                    { title: "Link", url: "" },
                  ])
                }
                className="w-full py-2 border border-dashed border-nous-border text-[10px] uppercase tracking-widest hover:bg-nous-base transition-colors rounded-none"
              >
                Add Resource
              </button>
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <AddToHomeScreenBanner />
            {user?.isAnonymous ? (
              <>
                <button
                  onClick={() => handleGoogleLink()}
                  className="w-full flex items-center justify-center gap-2 py-4 border border-nous-border text-[10px] uppercase tracking-widest hover:bg-nous-base hover:text-nous-text dark:hover:bg-stone-200 dark:hover:text-black transition-all rounded-none"
                >
                  Sign in with Google
                </button>
                <button
                  onClick={() => {
                    const email = window.prompt("Enter your email address:");
                    if (email) {
                      loginWithEmail(email, window.location.href);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 border border-nous-border text-[10px] uppercase tracking-widest hover:bg-nous-base hover:text-nous-text dark:hover:bg-stone-200 dark:hover:text-black transition-all rounded-none"
                >
                  Sign in with Email Link
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-4 border border-nous-border/30 bg-nous-base/10 text-[10px] uppercase tracking-widest text-nous-text rounded-none">
                <Check size={14} /> Identity Anchored
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-nous-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block">
                  INTELLIGENCE CONNECTIONS
                </h3>
                <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                  Optional · Settings
                </span>
              </div>
              <p className="text-[10px] text-nous-subtle mb-3 leading-relaxed">
                Server AI Gateway covers most flows. Bring-your-own keys remain available for power users who want sovereign compute, but they are no longer required for the default product path.
              </p>
              {profilePane === 'settings' ? (
              <>
              <div className="p-4 border border-nous-border bg-nous-base/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-8 h-8 bg-nous-base border border-nous-border">
                    <Key size={14} className="text-nous-subtle" />
                  </div>
                  <div>
                    <span className="font-bold text-xs">Google Gemini API</span>
                    <span className="block text-[9px] uppercase tracking-widest text-nous-subtle mt-0.5">
                      {geminiKeyStatus === 'valid' ? 'Sovereign Compute Active' : 
                       geminiKeyStatus === 'fallback' ? 'Using Public Fallback' : 
                       geminiKeyStatus === 'checking' ? 'Testing Connection...' : 
                       'Credentials Suspended'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {geminiKeyStatus === 'checking' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wider animate-pulse">
                      <Loader2 size={10} className="animate-spin" /> Verifying...
                    </span>
                  )}
                  {geminiKeyStatus === 'valid' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-wider font-bold">
                      <CheckCircle2Icon size={12} className="text-emerald-500" /> Key Verified
                    </span>
                  )}
                  {geminiKeyStatus === 'fallback' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-blue-300 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wider font-bold">
                      Fallback Active
                    </span>
                  )}
                  {geminiKeyStatus === 'invalid' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] uppercase tracking-wider font-bold">
                      <XCircleIcon size={12} className="text-red-500" /> Invalid Key
                    </span>
                  )}
                </div>
              </div>

              {geminiKeyStatus === 'invalid' && geminiKeyError && (
                <p className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/10 border border-red-200 p-2.5 font-mono mt-2 leading-relaxed">
                  <span className="font-bold">Error details:</span> {geminiKeyError}
                </p>
              )}

              {/* Inline Key Re-entry and Management Actions */}
              {isUpdatingKey ? (
                <div className="mt-3 p-4 border border-dashed border-nous-border bg-stone-50/50 dark:bg-stone-900/50 space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-nous-subtle mb-1">
                      Enter Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      className="w-full bg-white dark:bg-stone-950 border border-nous-border p-2.5 font-mono text-xs focus:outline-none focus:border-nous-text text-nous-text"
                    />
                    <span className="block text-[8px] text-nous-subtle mt-1 uppercase tracking-widest">
                      Your key is securely anchored in local storage and never transmitted to external services.
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsUpdatingKey(false)}
                      className="px-3 py-1.5 border border-nous-border hover:bg-nous-base text-[9px] uppercase tracking-widest text-nous-subtle transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInlineSaveKey}
                      className="px-4 py-1.5 bg-nous-text text-white dark:text-black hover:bg-stone-800 text-[9px] uppercase tracking-widest font-bold transition-all"
                    >
                      Anchor & Test
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2 justify-end font-mono">
                  {getStoredKey('gemini') ? (
                    <>
                      <button
                        onClick={() => {
                          setNewKeyInput(getStoredKey('gemini') || "");
                          setIsUpdatingKey(true);
                        }}
                        className="px-3 py-1.5 border border-nous-border hover:bg-nous-base text-[9px] uppercase tracking-widest text-nous-text transition-colors"
                      >
                        Rotate Key
                      </button>
                      <button
                        onClick={handleClearAndReconnect}
                        className="px-3 py-1.5 border border-red-200 hover:bg-red-50 dark:hover:bg-red-950/15 text-[9px] uppercase tracking-widest text-red-600 transition-colors"
                      >
                        Disconnect Key
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsUpdatingKey(true)}
                      className="px-3 py-1.5 border border-nous-border hover:bg-nous-base text-[9px] uppercase tracking-widest text-nous-text font-bold transition-colors"
                    >
                      Set Sovereign API Key
                    </button>
                  )}
                </div>
              )}
              </>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfilePane('settings')}
                  className="px-4 py-2 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text"
                >
                  Manage keys in Settings →
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-nous-border">
              <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-4 block">
                Module Visibility
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  "studio",
                  "dossier",
                  "darkroom",
                  "oracle",
                  "thimble",
                  "archival",
                  "threads",
                  "latent-constellation",
                  "brand-intake",
                  "aesthetic-tokens",
                  "wardrobe",
                  "tailor",
                  "loom",
                  "action-board",
                  "taste-identity",
                  "press",
                  "signature",
                  "taste-discovery",
                  "ward",
                  "taste-graph",
                  "nebula",
                  "proscenium",
                ].map((modId) => {
                  const isHidden = profile?.hiddenMenuItems?.includes(modId);
                  return (
                    <button
                      key={modId}
                      onClick={() => {
                        const current = profile?.hiddenMenuItems || [];
                        if (current.includes(modId)) {
                          updateProfile({
                            ...profile,
                            hiddenMenuItems: current.filter(
                              (id) => id !== modId,
                            ),
                          });
                        } else {
                          updateProfile({
                            ...profile,
                            hiddenMenuItems: [...current, modId],
                          });
                        }
                      }}
                      className={
                        "border px-3 py-2 text-left " +
                        (isHidden
                          ? "border-nous-border text-nous-subtle/50 line-through"
                          : "border-nous-text bg-nous-text/5")
                      }
                    >
                      <span className="font-mono text-[9px] uppercase tracking-widest">
                        {modId.replace("-", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Clean Aesthetic Text-Summary Card (Replacing the Orb) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-nous-base rounded-none border border-nous-border p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-serif italic text-2xl text-nous-text  mb-2">
                Aesthetic Identity
              </h2>
              <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle mb-6">
                Semantic Baseline
              </p>
            </div>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", { detail: "thimble" }),
                )
              }
              className="text-[10px] uppercase tracking-widest border-b border-nous-border pb-0.5"
            >
              Taste Dashboard
            </button>
          </div>

          {profile?.tasteProfile ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-3">
                  Dominant Archetypes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.tasteProfile.dominant_archetypes?.map(
                    (archetype, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-nous-base text-nous-text text-xs font-mono rounded-none border border-nous-border"
                      >
                        {archetype}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-3">
                  Aesthetic Nodes (Semantic Clusters)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const seed = profile?.handle ? profile.handle.length : 5;
                    const allClusters = [
                      "Luxury Utilitarian",
                      "Low-Fidelity Archival",
                      "Brutalist Domestic",
                      "Tactile Nostalgia",
                      "Synthesized Naturals",
                      "Post-Irony Streetwear",
                      "Ambient Avant-Garde",
                      "Corporate Core",
                      "Neo-Romance",
                    ];
                    const subset = [
                      allClusters[seed % allClusters.length],
                      allClusters[(seed + 3) % allClusters.length],
                      allClusters[(seed + 7) % allClusters.length],
                    ];
                    return subset.map((cluster, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-transparent border border-nous-border text-nous-subtle text-[10px] font-mono tracking-wider rounded-none uppercase"
                      >
                        # {cluster}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {profile.tasteProfile.constraints &&
                profile.tasteProfile.constraints.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle mb-3">
                      Constraints
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.tasteProfile.constraints?.map(
                        (constraint, i) => (
                          <span
                            key={i}
                            className="px-4 py-2 bg-nous-base /50 text-nous-subtle text-xs font-mono rounded-none border border-nous-border"
                          >
                            {constraint}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed border-nous-border rounded-none">
              <p className="font-mono text-xs text-nous-subtle mb-6 uppercase tracking-widest">
                No Graph Data Detected
              </p>
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("mimi:change_view", {
                      detail: "taste-graph",
                    }),
                  )
                }
                className="px-8 py-4 bg-nous-base dark:bg-stone-200 text-nous-base text-[10px] uppercase tracking-[0.2em] hover:bg-stone-700 dark:hover:bg-white transition-colors rounded-none"
              >
                Extract Graph
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", {
                    detail: "taste-graph",
                  }),
                )
              }
              className="p-4 border border-nous-border text-left hover:bg-nous-base transition-colors rounded-none"
            >
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">
                Taste Graph
              </h4>
              <p className="text-xs text-nous-subtle leading-relaxed italic">
                Visualizing sensory benchmarks across ingested artifacts.
              </p>
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", {
                    detail: "taste-graph",
                  }),
                )
              }
              className="p-4 border border-nous-border text-left hover:bg-nous-base transition-colors rounded-none"
            >
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2">
                Semantic Network
              </h4>
              <p className="text-xs text-nous-subtle leading-relaxed italic">
                Mapping relationships between disparate creative nodes.
              </p>
            </button>
          </div>
        </motion.div>

        {/* Workspace Interface Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full bg-nous-base rounded-none border border-nous-border p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-2xl italic">
              Workspace Interface Config
            </h2>
            <Settings size={16} className="text-nous-subtle" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block">
                  Base Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColors.base}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        base: e.target.value,
                      }))
                    }
                    className="w-8 h-8 rounded-none border border-nous-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColors.base}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        base: e.target.value,
                      }))
                    }
                    className="w-full bg-transparent font-mono text-xs border-b border-nous-border pb-1 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColors.text}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                    className="w-8 h-8 rounded-none border border-nous-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColors.text}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                    className="w-full bg-transparent font-mono text-xs border-b border-nous-border pb-1 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColors.accent}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        accent: e.target.value,
                      }))
                    }
                    className="w-8 h-8 rounded-none border border-nous-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColors.accent}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        accent: e.target.value,
                      }))
                    }
                    className="w-full bg-transparent font-mono text-xs border-b border-nous-border pb-1 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block">
                  Interface Font
                </label>
                <select
                  value={customColors.fontFamily}
                  onChange={(e) =>
                    setCustomColors((prev) => ({
                      ...prev,
                      fontFamily: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent border-b border-nous-border pb-1 font-mono text-xs focus:outline-none"
                >
                  <option value="sans">Geist (Modern)</option>
                  <option value="serif">Garamond (Editorial)</option>
                  <option value="mono">JetBrains (Technical)</option>
                  <option value="'Space Grotesk'">Space Grotesk</option>
                  <option value="'Playfair Display'">Playfair Display</option>
                  <option value="'DM Sans'">DM Sans</option>
                </select>
                <div className="flex gap-2 mt-2">
                  <input
                    value={customFontInput}
                    onChange={(e) => setCustomFontInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetchFont()}
                    placeholder="Or import e.g. Cinzel"
                    className="flex-1 bg-transparent border-b border-nous-border py-1 font-serif italic text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleFetchFont}
                    disabled={isFontLoading}
                    className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle hover:text-nous-text"
                  >
                    {isFontLoading ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Download size={10} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() =>
                  manifestPalette({
                    name: "Custom Workspace",
                    genre: "Tailored",
                    base: customColors.base,
                    text: customColors.text,
                    accent: customColors.accent,
                    subtle: customColors.text + "80",
                    border: customColors.text + "20",
                    isDark: false,
                    fontFamily: customColors.fontFamily,
                  })
                }
                className="px-6 py-3 bg-nous-text text-nous-base text-[10px] uppercase tracking-[0.2em] hover:bg-stone-500 transition-colors rounded-none"
              >
                Inject CSS Theme
              </button>

              <button
                onClick={() => {
                  applyPalette("The Journal");
                  setCustomColors({
                    base: PALETTES["The Journal"].base,
                    text: PALETTES["The Journal"].text,
                    accent: PALETTES["The Journal"].accent,
                    fontFamily: PALETTES["The Journal"].fontFamily || "sans",
                  });
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
                    detail: { message: "CSS Themes Reset to Default Journal", icon: <RotateCcw size={14} /> }
                  }));
                }}
                className="px-6 py-3 border border-dashed border-nous-border text-nous-text text-[10px] uppercase tracking-[0.2em] hover:bg-nous-base transition-colors rounded-none"
              >
                Reset CSS Styles
              </button>

              <div className="flex gap-2 flex-wrap">
                {["Vanilla", "Void", "The Journal"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      applyPalette(preset);
                      setCustomColors({
                        base: PALETTES[preset].base,
                        text: PALETTES[preset].text,
                        accent: PALETTES[preset].accent,
                        fontFamily: PALETTES[preset].fontFamily || "sans",
                      });
                    }}
                    className="px-4 py-3 border border-nous-border text-[10px] uppercase font-mono tracking-widest hover:bg-nous-base rounded-none transition-colors"
                  >
                    Load: {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <KeychainPanel />

        {/* Global Structural Logic (Agent Configuration) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-white rounded-none border border-nous-border p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-2xl italic">
              Global Structural Logic
            </h2>
            <span className="text-[10px] uppercase tracking-widest font-mono px-3 py-1 border border-nous-border rounded-none text-nous-subtle">
              Agent Config
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-3">
                Grounding Logic Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setArchetype("editorial-serif")}
                  className={`text-[10px] font-mono border px-4 py-2 rounded-none ${archetype === "editorial-serif" ? "bg-nous-text text-nous-base border-nous-text" : "bg-white border-nous-border "}`}
                >
                  Editorial
                </button>
                <button
                  onClick={() => setArchetype("minimalist-sans")}
                  className={`text-[10px] font-mono border px-4 py-2 rounded-none ${archetype === "minimalist-sans" ? "bg-nous-text text-nous-base border-nous-text" : "bg-white border-nous-border "}`}
                >
                  Minimalist
                </button>
                <button
                  onClick={() => setArchetype("brutalist-mono")}
                  className={`text-[10px] font-mono border px-4 py-2 rounded-none ${archetype === "brutalist-mono" ? "bg-nous-text text-nous-base border-nous-text" : "bg-white border-nous-border "}`}
                >
                  Brutalist
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle">
                      Curator Agent
                    </label>
                    <button
                      onClick={() => setCuratorEnabled(!curatorEnabled)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-none border ${curatorEnabled ? "text-nous-text border-nous-border bg-nous-base " : "text-nous-subtle border-nous-border "}`}
                    >
                      {curatorEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                  <SemanticSteps
                    steps={[
                      { label: "Low", value: 10 },
                      { label: "Med", value: 50 },
                      { label: "High", value: 100 },
                    ]}
                    value={curatorBudget}
                    onChange={(val) => setCuratorBudget(val)}
                  />
                  <div className="text-[8px] font-mono text-nous-subtle text-right mt-1">
                    Budget: {curatorBudget}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle">
                      Sentinel Agent
                    </label>
                    <button
                      onClick={() => setSentinelEnabled(!sentinelEnabled)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-none border ${sentinelEnabled ? "text-nous-text border-nous-border bg-nous-base " : "text-nous-subtle border-nous-border "}`}
                    >
                      {sentinelEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                  <SemanticSteps
                    steps={[
                      { label: "Low", value: 10 },
                      { label: "Med", value: 50 },
                      { label: "High", value: 100 },
                    ]}
                    value={sentinelBudget}
                    onChange={(val) => setSentinelBudget(val)}
                  />
                  <div className="text-[8px] font-mono text-nous-subtle text-right mt-1">
                    Budget: {sentinelBudget}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-3">
                The Eraser Line
              </label>
              <textarea
                value={tasteDefinition}
                onChange={(e) => setTasteDefinition(e.target.value)}
                placeholder="Describe your baseline era, inspirations, and scotopic preferences..."
                className="font-serif text-lg leading-snug text-nous-subtle border border-nous-border rounded-none p-4 bg-nous-base /50 resize-none flex-grow focus:outline-none focus:ring-1 focus:ring-stone-400 w-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Sovereign Mask System (AI Personas) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-white rounded-none border border-nous-border p-8"
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-2xl italic">
              Sovereign Mask System
            </h2>
            <UserCircle2 className="text-nous-subtle" size={16} />
          </div>

          <div className="flex-grow flex flex-col justify-center py-2">
            {isAddingPersona ? (
              <div className="space-y-4">
                <input
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="Mask Name"
                  className="w-full bg-transparent border-b border-nous-border p-2 font-serif italic focus:outline-none text-lg"
                />
                <input
                  value={newPersonaKey}
                  onChange={(e) => setNewPersonaKey(e.target.value)}
                  placeholder="API Key (Optional)"
                  type="password"
                  className="w-full bg-transparent border-b border-nous-border p-2 font-mono text-xs focus:outline-none"
                />
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={handleCreateMask}
                    className="flex-1 py-4 bg-nous-text text-nous-base text-[10px] uppercase tracking-widest rounded-none hover:bg-nous-text0 transition-colors"
                  >
                    Mint
                  </button>
                  <button
                    onClick={() => setIsAddingPersona(false)}
                    className="flex-1 py-4 border border-nous-border text-[10px] uppercase tracking-widest rounded-none hover:bg-nous-base transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isEditingMask && activePersona ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="font-serif italic text-2xl">
                    {activePersona.name}
                  </span>
                  <button
                    onClick={() => setIsEditingMask(false)}
                    className="text-nous-subtle hover:text-nous-text"
                  >
                    <Settings size={16} />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle block mb-4">
                    Temperature: {editingMaskTemp}
                  </label>
                  <SemanticSteps
                    steps={[
                      { label: "0.0", value: 0 },
                      { label: "0.5", value: 0.5 },
                      { label: "1.0", value: 1 },
                      { label: "1.5", value: 1.5 },
                      { label: "2.0", value: 2 },
                    ]}
                    value={editingMaskTemp}
                    onChange={(val) => setEditingMaskTemp(val)}
                  />
                </div>
                <button
                  onClick={handleUpdateActiveMask}
                  className="w-full py-4 bg-nous-text text-nous-base text-[10px] uppercase tracking-widest rounded-none hover:bg-nous-text0 transition-colors mt-4"
                >
                  Save Parameters
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle">
                    Active Mask
                  </span>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={prevMask}
                      className="text-nous-subtle hover:text-nous-text p-2"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <span className="font-serif text-4xl italic truncate px-4">
                      {activePersona?.name || "Personal"}
                    </span>
                    <button
                      onClick={nextMask}
                      className="text-nous-subtle hover:text-nous-text p-2"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>

                <div className="bg-nous-base /50 rounded-none p-4 mb-6 border border-nous-border">
                  <div className="flex justify-between text-[10px] font-mono mb-2">
                    <span className="text-nous-subtle">Identity Namespace</span>
                    <span>
                      {activePersona?.id.substring(0, 8).toUpperCase() ||
                        "PN-8821"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-nous-subtle">Parameters</span>
                    <button
                      onClick={() => {
                        setEditingMaskTemp(
                          activePersona?.operationalParameters?.temperature ||
                            0.7,
                        );
                        setIsEditingMask(true);
                      }}
                      className="underline text-nous-text"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingPersona(true)}
                  className="w-full py-4 bg-nous-base text-[10px] uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors rounded-none font-medium"
                >
                  Mint New Mask
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Patron Status & Social Resonance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-white rounded-none border border-nous-border p-8"
        >
          {/* Patron Status Bar */}
          <div className="mb-8 pb-8 border-b border-nous-border">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-serif text-2xl italic">Patron Status</h3>
                <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle mt-1">
                  Membership &amp; Access Level
                </p>
              </div>
              <span className="text-[10px] font-mono text-nous-subtle bg-nous-base px-3 py-1 rounded-none border border-nous-border shrink-0">
                Since{" "}
                {new Date(
                  profile?.createdAt || Date.now(),
                ).toLocaleDateString()}
              </span>
            </div>

            {/* Status Banner */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border ${
                isPatronActive
                  ? "border-nous-border bg-nous-base/40"
                  : "border-dashed border-nous-border bg-nous-base/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-2 h-10 rounded-none shrink-0 ${
                    isPatronActive
                      ? "bg-nous-text"
                      : "bg-stone-300 dark:bg-stone-600"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-xl italic capitalize">
                      {isPatronActive
                        ? profile?.membershipPlan ||
                          profile?.planStatus ||
                          profile?.plan ||
                          "Patron"
                        : "Standard"}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border ${
                        isPatronActive
                          ? "border-nous-border text-nous-text bg-nous-base"
                          : "border-stone-300 text-nous-subtle dark:border-stone-600"
                      }`}
                    >
                      {isPatronActive ? "Active" : "Free Tier"}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-nous-subtle mt-1">
                    {isPatronActive
                      ? `Subscription active · ${profile?.subscriptionStatus || "confirmed"}`
                      : "No active membership · upgrade to unlock full access"}
                  </p>
                </div>
              </div>

              {isPatronActive && (
                <div className="flex gap-6 shrink-0">
                  {[
                    { label: "AI Credits", value: patronAiCreditsLabel },
                    { label: "Modules", value: "All Access" },
                    { label: "Storage", value: "Extended" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                        {label}
                      </span>
                      <span className="block font-serif text-sm italic mt-0.5 text-nous-text">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handleOpenBillingPortal}
                disabled={isBillingPortalLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-nous-border text-[10px] uppercase tracking-widest hover:bg-nous-base transition-all rounded-none"
              >
                {isBillingPortalLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ExternalLink size={13} />
                )}
                {isPatronActive ? "Manage Membership" : "Billing Portal"}
              </button>
              {!isPatronActive && (
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("mimi:open_patron_modal"),
                    )
                  }
                  className="flex-1 py-3 bg-nous-text text-nous-base text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity rounded-none font-bold"
                >
                  Upgrade to Patron →
                </button>
              )}
            </div>
          </div>

            <div className="flex-grow flex flex-col">
            <h3 className="font-serif text-2xl italic mb-6">
              Social Resonance
            </h3>
            <div className="flex-grow overflow-y-auto no-scrollbar min-h-[150px]">
              <ConnectionsManager />
              {profilePane === 'settings' && (
                <>
                  <div className="p-4 mb-4 border border-nous-border bg-nous-base/40 text-nous-subtle text-xs font-mono leading-relaxed">
                    Optional BYOK vault. Prefer server AI Gateway for default flows; keep local keys only if you need sovereign override.
                  </div>
                  <ApiKeyRing />
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sovereign Backup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-white rounded-none border border-nous-border p-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <div>
                <h2 className="font-serif text-2xl italic mb-2">
                  Sovereign Backup
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-mono text-nous-subtle">
                  Last commit: {new Date().toLocaleTimeString()} UTC
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-6 py-4 border border-nous-border text-[10px] uppercase tracking-widest hover:bg-nous-base transition-colors rounded-none w-full"
              >
                {isExporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Export Archive (.json)
              </button>
            </div>

            <div className="flex flex-col gap-4 w-full md:w-auto">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-4 bg-nous-base dark:bg-stone-200 text-nous-base text-[10px] uppercase tracking-widest hover:bg-stone-700 dark:hover:bg-white transition-colors rounded-none font-medium"
              >
                {isSaving ? "Committing..." : "Commit Global Handshake"}
              </button>
              <button
                onClick={logout}
                className="px-8 py-4 border border-red-200 text-red-600 text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors rounded-none"
              >
                De-Anchor Account
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 mb-8 flex flex-col md:flex-row justify-between items-center text-nous-subtle font-mono text-[9px] uppercase tracking-widest">
        <div>© {new Date().getFullYear()} Mimi Zine Logic Registry</div>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="hover:text-nous-text">
            Protocol Documentation
          </a>
          <a href="#" className="hover:text-nous-text">
            Identity FAQ
          </a>
          <a href="#" className="hover:text-nous-text">
            Terms of Sovereignty
          </a>
        </div>
      </footer>
    </div>
  );
};
