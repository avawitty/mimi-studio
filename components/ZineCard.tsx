// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import { ZineMetadata, ToneTag } from "../types";
import {
  Activity,
  Sparkles,
  Eye,
  Radio,
  ShieldCheck,
  Bookmark,
  Check,
  Hash,
  ArrowUpRight,
  EyeOff,
  Edit2,
  Shuffle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  applyAestheticRefraction,
  generateZineImage,
} from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { ProofMode } from "./ProofMode";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import { db } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";

const TONE_STYLES: Record<
  string,
  {
    border: string;
    text: string;
    accent: string;
    aspect: string;
    grainOpacity: string;
    overlayColor: string;
  }
> = {
  default: {
    border: "border-nous-border/30",
    text: "text-nous-text",
    accent: "text-nous-accent",
    aspect: "aspect-[4/5]",
    grainOpacity: "opacity-[0.15]",
    overlayColor: "bg-nous-base/90",
  },
};

const getToneColor = (tone?: string) => {
  if (!tone) return "text-zinc-800 dark:text-zinc-200";
  const t = tone.toLowerCase();

  if (
    t.includes("brutal") ||
    t.includes("excess") ||
    t.includes("red") ||
    t.includes("blood") ||
    t.includes("flesh")
  )
    return "text-[#8A2B2B] dark:text-[#E89E9E]";
  if (
    t.includes("ethereal") ||
    t.includes("ghost") ||
    t.includes("pale") ||
    t.includes("spirit")
  )
    return "text-[#6C8599] dark:text-[#A7C5DB]";
  if (
    t.includes("neon") ||
    t.includes("cyber") ||
    t.includes("acid") ||
    t.includes("electric")
  )
    return "text-[#008B8B] dark:text-[#00E5FF]";
  if (t.includes("void") || t.includes("dark") || t.includes("abyss"))
    return "text-[#1A1A1A] dark:text-[#FAFAFA]";
  if (t.includes("warm") || t.includes("sun") || t.includes("gold"))
    return "text-[#8B6508] dark:text-[#FFD700]";
  if (t.includes("nature") || t.includes("growth") || t.includes("moss"))
    return "text-[#4A6B4A] dark:text-[#8FBC8F]";

  // Hash based consistent colors for other tones
  const colors = [
    "text-[#3a5a40] dark:text-[#7bb084]",
    "text-[#5c4d3c] dark:text-[#b09676]",
    "text-[#4b3b4b] dark:text-[#917691]",
    "text-[#2b3a4a] dark:text-[#6a87a6]",
    "text-[#663344] dark:text-[#c47790]",
  ];
  let hash = 0;
  for (let i = 0; i < tone.length; i++) {
    hash = tone.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface ZineCardProps {
  zine: ZineMetadata;
  onClick: () => void;
  currentUserId?: string;
  isSocialFloor?: boolean;
  isMasonry?: boolean; // NEW PROP
}

export const ZineCard: React.FC<ZineCardProps> = React.memo(
  ({ zine, onClick, currentUserId, isSocialFloor, isMasonry }) => {
    const { profile, user } = useUser();
    const { currentPalette } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const [isArchived, setIsArchived] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPrompt, setEditPrompt] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showProofPanel, setShowProofPanel] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState(
      zine.coverImageUrl || zine.content?.hero_image_url,
    );

    const handleEdit = async () => {
      if (!currentImageUrl || !editPrompt || !user) return;
      setIsEditing(true);
      try {
        let base64Image = currentImageUrl;
        if (currentImageUrl.startsWith("http")) {
          const response = await fetch(currentImageUrl);
          const blob = await response.blob();
          base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const newImage = await applyAestheticRefraction(
          base64Image as string,
          editPrompt,
          profile,
        );
        setCurrentImageUrl(newImage);
        setShowEditModal(false);
        setEditPrompt("");

        const { archiveManager } = await import("../services/archiveManager");
        const uploadedUrl = await archiveManager.uploadMedia(
          user.uid,
          newImage,
          `zine_artifacts/${zine.id}_${Date.now()}`,
        );
        await updateDoc(doc(db, "zines", zine.id), {
          coverImageUrl: uploadedUrl,
        });

        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Artifact Refracted.",
              icon: <Sparkles size={14} />,
            },
          }),
        );
      } catch (err) {
        console.error("Edit Failed", err);
      } finally {
        setIsEditing(false);
      }
    };

    const handleMix = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentImageUrl || !user) return;
      setIsRegenerating(true);
      try {
        let base64Image = currentImageUrl;
        if (currentImageUrl.startsWith("http")) {
          const response = await fetch(currentImageUrl);
          const blob = await response.blob();
          base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const newImage = await applyAestheticRefraction(
          base64Image as string,
          "Surprise me with a completely different aesthetic interpretation, abstract and surreal.",
          profile,
        );
        setCurrentImageUrl(newImage);

        const { archiveManager } = await import("../services/archiveManager");
        const uploadedUrl = await archiveManager.uploadMedia(
          user.uid,
          newImage,
          `zine_artifacts/${zine.id}_${Date.now()}`,
        );
        await updateDoc(doc(db, "zines", zine.id), {
          coverImageUrl: uploadedUrl,
        });

        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: { message: "Artifact Mixed.", icon: <Shuffle size={14} /> },
          }),
        );
      } catch (err) {
        console.error("Mix Failed", err);
      } finally {
        setIsRegenerating(false);
      }
    };

    const handleRegenerate = async () => {
      if (!zine.content?.headlines?.[0] || !user) return;
      setIsRegenerating(true);
      try {
        const newImage = await generateZineImage(
          zine.content.headlines[0],
          "3:4",
          "1K",
          profile,
          false,
          undefined,
          undefined,
          zine.treatmentId,
        );
        setCurrentImageUrl(newImage);

        const { archiveManager } = await import("../services/archiveManager");
        const uploadedUrl = await archiveManager.uploadMedia(
          user.uid,
          newImage,
          `zine_artifacts/${zine.id}_${Date.now()}`,
        );
        await updateDoc(doc(db, "zines", zine.id), {
          coverImageUrl: uploadedUrl,
        });

        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Artifact Regenerated.",
              icon: <Sparkles size={14} />,
            },
          }),
        );
      } catch (err) {
        console.error("Regenerate Failed", err);
      } finally {
        setIsRegenerating(false);
      }
    };

    const baseStyles = TONE_STYLES["default"];

    const styles = useMemo(() => {
      if (currentPalette.isDark && baseStyles.dark) {
        return { ...baseStyles, ...baseStyles.dark };
      }
      return baseStyles;
    }, [currentPalette.isDark, baseStyles, zine.tone]);

    const headlineFont =
      profile?.tasteProfile?.dominant_archetypes?.[0] === "brutalist-mono"
        ? "font-mono"
        : "font-serif";

    const handlePublishToggle = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user || user.uid !== zine.userId) return;
      const nextPublic = !zine.isPublic;
      try {
        await updateDoc(doc(db, "zines", zine.id), {
          isPublic: nextPublic,
          // Bump both fields so Keep Tabs RSS windows (orderBy timestamp and
          // orderBy publishedAt) include republished older drafts.
          ...(nextPublic
            ? { publishedAt: Date.now(), timestamp: Date.now() }
            : {}),
        });
        const handle = zine.userHandle || profile?.handle;
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: nextPublic
                ? handle
                  ? `Published · Keep Tabs at /u/${handle}/feed.xml`
                  : "Zine Published to Press."
                : "Zine Unpublished.",
              icon: <Radio size={14} />,
            },
          }),
        );
        window.dispatchEvent(new CustomEvent("mimi:artifact_finalized"));
      } catch (err) {
        console.error("Publish Toggle Failed", err);
      }
    };

    const handleArchive = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isArchived || isArchiving || !user) return;
      setIsArchiving(true);
      try {
        const { archiveManager } = await import("../services/archiveManager");
        await archiveManager.saveToPocket(user.uid, "zine_card", {
          zineId: zine.id,
          title: zine.content?.headlines?.[0] || zine.title || "Untitled",
          analysis: {
            ...zine.content,
            design_brief:
              zine.content.strategic_hypothesis ||
              zine.content.designBrief ||
              zine.content.poetic_interpretation,
          },
          timestamp: Date.now(),
          imageUrl: zine.coverImageUrl || zine.content.hero_image_url,
        });
        setIsArchived(true);
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Zine Anchored to Archive.",
              icon: <Bookmark size={14} />,
            },
          }),
        );
      } catch (err) {
        console.error("Archive Failed", err);
      } finally {
        setIsArchiving(false);
      }
    };

    const displayTitle =
      zine.content?.headlines?.[0] || zine.title || "Untitled";

    return (
      <motion.div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative cursor-pointer w-full ${isSocialFloor ? "max-w-5xl" : isMasonry ? "max-w-none" : "max-w-[340px] md:max-w-[420px]"} mx-auto rounded-none group ${isMasonry ? "mb-16" : ""}`}
      >
        <div
          className={`w-full flex flex-col ${isMasonry ? "aspect-auto" : styles.aspect} ${styles.wrapper} bg-white dark:bg-zinc-950 border border-nous-border/10 relative shadow-sm transition-all duration-700 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]`}
        >
          {/* DOSSIER HEADER (Inside Card, z-10) */}
          <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-start opacity-70 group-hover:opacity-100 transition-opacity duration-700">
            <div className="flex flex-col gap-1">
              <span
                className={`font-mono text-xs uppercase tracking-widest ${styles.text}`}
              >
                VOL. {(zine.timestamp % 99).toString().padStart(2, "0")} //{" "}
                {zine.tone}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest opacity-60 ${styles.text}`}
              >
                ARTIFACT // {zine.id.substring(0, 8)}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest opacity-60 ${styles.text}`}
              >
                {new Date(zine.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1"></div>
          </div>

          {/* INNER CLIPPED CONTAINER (For image and background) */}
          <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
            {/* TEXTURE LAYER */}
            <div
              className={`absolute inset-0 ${styles.grainOpacity} bg-[url('https://www.transparenttextures.com/patterns/noise.png')] z-10 mix-blend-overlay`}
            />

            {/* BINDER HOLES */}
            <div className="absolute top-0 bottom-0 left-3 w-4 flex flex-col justify-evenly py-12 z-20 opacity-40">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-black/10 shadow-inner"
                />
              ))}
            </div>

            {/* IMAGE LAYER */}
            {currentImageUrl && (
              <div
                className={`absolute inset-0 transition-opacity duration-[1.5s] z-0 bg-white dark:bg-zinc-950`}
              >
                <img
                  src={currentImageUrl}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover transition-all duration-1000 grayscale opacity-[0.25] dark:opacity-[0.15] mix-blend-multiply dark:mix-blend-screen scale-100 group-hover:scale-105 group-hover:opacity-40 filter contrast-125`}
                  alt=""
                />
              </div>
            )}

            {/* MASONRY: OVERLAY GRADIENT */}
            {isMasonry && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity z-10" />
            )}
          </div>

          {/* BOTTOM: AUTHOR */}
          {!isMasonry && (
            <div className="absolute bottom-0 left-0 right-0 z-10 p-6 flex justify-between items-end opacity-80 group-hover:opacity-100 transition-opacity duration-700">
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full bg-current ${styles.text}`}
                />
                <span
                  className={`font-sans text-[11px] uppercase tracking-[0.2em] font-black ${styles.text}`}
                >
                  @{zine.userHandle || "Ghost"}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProofPanel(!showProofPanel);
                }}
                className={`flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest border border-current/30 px-2.5 py-1 bg-white dark:bg-[#0A0A0A] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all cursor-pointer pointer-events-auto ${styles.text}`}
              >
                <Activity size={10} className={showProofPanel ? "animate-pulse text-emerald-500" : ""} />
                {showProofPanel ? "Hide Proof" : "Show Proof"}
              </button>
            </div>
          )}
        </div>

        {/* GENERATE FRAGMENT TAB */}
        {!isMasonry && (
          <div className="absolute top-full left-0 right-0 z-40 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRegenerate();
              }}
              disabled={isRegenerating}
              className="px-4 py-2.5 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-sans text-[10px] uppercase tracking-[0.15em] font-bold shadow-sm hover:bg-black dark:hover:bg-white transition-colors flex items-center justify-center gap-2 rounded-b-md w-[85%] md:w-[70%]"
            >
              {isRegenerating ? (
                <RotateCcw className="animate-spin" size={12} />
              ) : (
                <Sparkles size={12} />
              )}
              {isRegenerating ? "Scrying..." : currentImageUrl ? "Regenerate Cover" : "Generate Cover"}
            </button>
          </div>
        )}

        {/* SPILLED TITLE (Outside of inner clipped container, above card z-index) */}
        {!isMasonry && (
          <div className="absolute inset-0 flex items-center justify-start pointer-events-none z-30 px-6">
            <h2
              className={`${headlineFont} ${getToneColor(zine.tone)} text-xl sm:text-2xl md:text-3xl uppercase leading-tight tracking-tight transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] text-left w-full group-hover:scale-[1.02] drop-shadow-xl group-hover:drop-shadow-[0_15px_25px_rgba(0,0,0,0.25)] font-medium z-40 line-clamp-4`}
              style={{ textWrap: "balance" }}
            >
              {displayTitle}
            </h2>
          </div>
        )}

        {/* MASONRY INLINE TITLE */}
        {isMasonry && (
          <div className="absolute inset-0 flex flex-col items-start justify-end p-6 z-30 space-y-4 pointer-events-none">
            <h2
              className={`${headlineFont} ${getToneColor(zine.tone)} text-2xl md:text-3xl uppercase leading-[0.95] tracking-tight drop-shadow-xl font-medium w-[105%] -ml-1 group-hover:scale-[1.02] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:drop-shadow-[0_15px_25px_rgba(0,0,0,0.3)] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-bottom-left`}
              style={{ textWrap: "balance" }}
            >
              {displayTitle}
            </h2>
            <div className="flex items-center gap-2 pt-2 border-t border-white/20 w-full hidden">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/60">
                @{zine.userHandle}
              </span>
              <ArrowUpRight
                size={10}
                className="text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        )}

        {/* ARCHIVE BUTTON OVERLAY */}
        <div className="absolute top-3 right-3 z-40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
          {user && user.uid === zine.userId && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProofPanel(!showProofPanel);
                }}
                className={`p-2 rounded-none transition-all backdrop-blur-md ${showProofPanel ? "bg-nous-text text-[#FDFBF7]" : "bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"}`}
                title="Verify AI Proof"
              >
                <Activity size={12} className={showProofPanel ? "animate-pulse text-emerald-500" : ""} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="p-2 rounded-none backdrop-blur-md bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                title="Edit"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={handleMix}
                className="p-2 rounded-none backdrop-blur-md bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                title="Mix"
              >
                <Shuffle size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerate();
                }}
                className={`p-2 rounded-none backdrop-blur-md ${isRegenerating ? "bg-nous-text text-nous-base " : "bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"} `}
                title="Regenerate"
              >
                <RotateCcw
                  size={12}
                  className={isRegenerating ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={handlePublishToggle}
                className={`p-2 rounded-none transition-all backdrop-blur-md ${zine.isPublic ? "bg-nous-text text-nous-base " : "bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"}`}
                title={zine.isPublic ? "Unpublish from public feed" : "Publish · Keep Tabs"}
              >
                {zine.isPublic ? <Radio size={12} /> : <EyeOff size={12} />}
              </button>
            </>
          )}
          <button
            onClick={handleArchive}
            className={`p-2 rounded-none transition-all backdrop-blur-md ${isArchived ? "bg-nous-text text-nous-base " : "bg-black/5 text-nous-text hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"}`}
            title="Archive to Pocket"
          >
            {isArchived ? <Check size={12} /> : <Bookmark size={12} />}
          </button>
        </div>

        {/* EDIT MODAL */}
        {showEditModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(false);
            }}
          >
            <div
              className="bg-nous-base p-6 rounded-none w-full max-w-sm border border-nous-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-mono uppercase tracking-widest text-nous-text">
                  Edit Image
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-nous-text hover:text-nous-subtle"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., add grain, make dress red..."
                className="w-full p-3 mb-4 bg-transparent border border-nous-border text-nous-text rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-nous-text"
                rows={3}
              />
              <button
                onClick={handleEdit}
                disabled={isEditing || !editPrompt}
                className="w-full py-3 bg-nous-text text-nous-base rounded-none text-xs font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-nous-subtle transition-colors"
              >
                {isEditing ? "Refracting..." : "Apply Edit"}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showProofPanel && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mt-4 text-left z-50 relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ProofMode
                isOpen={showProofPanel}
                onClose={() => setShowProofPanel(false)}
                confidence={zine.driftScore !== undefined && zine.driftScore < 20 ? 'High' : zine.driftScore < 50 ? 'Medium' : 'Exploratory'}
                basedOn={[
                  ...((zine.content?.taste_context?.active_palette?.length ? ["Active Base Neutral & Palette Grid"] : [])),
                  ...((profile?.tasteProfile?.aesthetic_core?.materials?.length ? ["Tailor Core Materiality Constraints"] : ["Tailor Archetype Map"])),
                  "Generative Scribe Intent Matching Node"
                ]}
                reasoning={[
                  "Maintains spatial grid compliance matching Inter typography settings.",
                  "Synthetically bounds chromatic density within fine-grain noise threshold of standard styling.",
                  "Leverages calibrated stylistic anchors for profile authority."
                ]}
                onAccept={() => {
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                    detail: { message: "Layout Element Accepted", type: 'success' } 
                  }));
                }}
                onSoften={() => {
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                    detail: { message: "Soften Modifier Applied", type: 'success' } 
                  }));
                }}
                onReject={() => {
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                    detail: { message: "Rejected Segment Suppressed", type: 'success' } 
                  }));
                }}
                onReTailor={() => {
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                    detail: { message: "Re-routing Vector to Tailor...", type: 'success' } 
                  }));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);
