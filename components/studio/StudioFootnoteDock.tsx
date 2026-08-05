import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export type StudioFootnoteDockTab = "continuum" | "pocket" | "telemetry";

const TAB_LABELS: Record<StudioFootnoteDockTab, string> = {
  continuum: "Continuum",
  pocket: "Pocket",
  telemetry: "Telemetry",
};

type StudioFootnoteDockProps = {
  open: boolean;
  activeTab: StudioFootnoteDockTab;
  onTabChange: (tab: StudioFootnoteDockTab) => void;
  onClose: () => void;
  continuum: React.ReactNode;
  pocket: React.ReactNode;
  telemetry: React.ReactNode;
};

export const StudioFootnoteDock: React.FC<StudioFootnoteDockProps> = ({
  open,
  activeTab,
  onTabChange,
  onClose,
  continuum,
  pocket,
  telemetry,
}) => {
  const panels: Record<StudioFootnoteDockTab, React.ReactNode> = {
    continuum,
    pocket,
    telemetry,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close studio dock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-black"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Studio continuum, pocket, and telemetry"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="studio-mobile-sheet fixed bottom-0 left-0 right-0 z-[110] max-h-[72vh] overflow-hidden border-t studio-border studio-bg-panel shadow-2xl flex flex-col"
          >
            <div className="sticky top-0 studio-bg-panel px-4 pt-3 pb-2 border-b studio-border shrink-0">
              <div className="w-10 h-1 rounded-full bg-current opacity-20 mx-auto mb-3" />
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif italic text-base studio-text-ink">Studio dock</p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dock"
                  className="w-9 h-9 flex items-center justify-center border studio-border studio-text-muted hover:studio-text-ink"
                >
                  <X size={15} />
                </button>
              </div>
              <div
                role="tablist"
                aria-label="Studio dock sections"
                className="mt-3 flex gap-1 overflow-x-auto no-scrollbar"
              >
                {(Object.keys(TAB_LABELS) as StudioFootnoteDockTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => onTabChange(tab)}
                    className={`shrink-0 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] border transition-colors ${
                      activeTab === tab
                        ? "studio-text-ink border-[var(--mimi-ink)]"
                        : "studio-text-muted studio-border"
                    }`}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {panels[activeTab]}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
