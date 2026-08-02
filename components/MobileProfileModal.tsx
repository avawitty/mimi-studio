import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  LogOut,
  User as UserIcon,
  LayoutGrid,
  PenLine,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { normalizePlanTier, PATRONAGE_PLAN_LABELS } from "../constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenShare?: () => void;
}

export const MobileProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenShare,
}) => {
  const { user, profile, logout } = useUser();

  if (!isOpen || !user) return null;

  const openProfile = (pane: "share" | "settings") => {
    try {
      sessionStorage.setItem("mimi:profile_pane", pane);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent("mimi:profile_pane", { detail: pane }),
    );
    if (pane === "settings") {
      onOpenSettings();
    } else if (onOpenShare) {
      onOpenShare();
    } else {
      onOpenSettings();
    }
  };

  const tier = profile?.plan
    ? normalizePlanTier(profile.plan)
    : null;
  const showPlan = Boolean(tier && profile?.plan && profile.plan !== "free");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Profile"
            className="w-full sm:w-[26rem] bg-nous-base border-t sm:border border-nous-border pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6"
          >
            <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-nous-border" />
            </div>

            <div className="flex justify-between items-start px-5 pt-4 pb-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
                  Identity
                </p>
                <h2 className="font-serif italic text-2xl text-nous-text leading-none mt-1">
                  Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-1 text-nous-subtle hover:text-nous-text transition-colors"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mx-5 mt-3 mb-5 relative overflow-hidden border border-nous-border bg-white dark:bg-nous-base">
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px)",
                  backgroundSize: "calc(100% / 6) 100%",
                }}
                aria-hidden
              />
              <div className="relative flex items-center gap-4 p-4">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                    className="w-16 h-16 object-cover border border-nous-border shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 border border-nous-border bg-nous-base flex items-center justify-center shrink-0">
                    <UserIcon size={28} className="text-nous-subtle" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-nous-subtle truncate">
                    {profile?.handle
                      ? `@${profile.handle}`
                      : user.email || "Guest"}
                  </p>
                  <h3 className="font-serif italic text-xl text-nous-text truncate leading-tight mt-0.5">
                    {profile?.displayName || "Anonymous"}
                  </h3>
                  {showPlan && tier && (
                    <span className="inline-block mt-2 font-mono text-[8px] uppercase tracking-[0.2em] border border-nous-border px-2 py-0.5 text-nous-subtle">
                      {PATRONAGE_PLAN_LABELS[tier]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 space-y-2">
              <button
                type="button"
                onClick={() => openProfile("share")}
                className="w-full flex items-center gap-3 p-3.5 border border-nous-border bg-white dark:bg-nous-base text-nous-text hover:bg-nous-base/60 transition-colors text-left"
              >
                <LayoutGrid size={16} className="text-nous-subtle shrink-0" />
                <div className="min-w-0">
                  <span className="block font-medium text-sm">Share card</span>
                  <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-0.5">
                    Public face · Stand · Signature
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openProfile("settings")}
                className="w-full flex items-center gap-3 p-3.5 border border-nous-border bg-white dark:bg-nous-base text-nous-text hover:bg-nous-base/60 transition-colors text-left"
              >
                <PenLine size={16} className="text-nous-subtle shrink-0" />
                <div className="min-w-0">
                  <span className="block font-medium text-sm">
                    Edit &amp; settings
                  </span>
                  <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mt-0.5">
                    Identity · keys · workspace · billing
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3.5 border border-red-200/80 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/20 transition-colors text-left"
              >
                <LogOut size={16} className="shrink-0" />
                <span className="font-medium text-sm">Log out</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
