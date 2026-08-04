import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  Zap,
  Share2,
  Loader2,
  WifiOff,
  Maximize2,
  Users,
  MessageSquare,
  Layers,
  Radio,
  ArrowRight,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { logFirestoreError, OperationType } from "../services/firebaseUtils";
import { ZineMetadata, VibeNote } from "../types";
import { subscribeToFollowing } from "../services/connections";
import { PublicProfileModal } from "./PublicProfileModal";
import { ConnectionsManager } from "./ConnectionsManager";
import { CliqueView } from "./CliqueView";
import { PublicField } from "./public-face/PublicField";
import { MimiWordmark } from "./public-face/MimiWordmark";
import { PressMark } from "./public-face/PressMark";
import { ColumnRule } from "./public-face/ColumnRule";
import { PublicCTA } from "./public-face/PublicCTA";

export type ProsceniumWing = "stage" | "correspondents" | "cliques";

interface Transmission {
  id: string;
  userId: string;
  userHandle: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
  type: "manifest" | "echo" | "signal";
  likes: number;
  zineData?: ZineMetadata;
  vibeNotes?: VibeNote[];
  /** Local demo specimen — never mix with live counts in copy */
  isDemo?: boolean;
}

interface ProsceniumViewProps {
  onSelectZine?: (zine: ZineMetadata) => void;
  initialWing?: ProsceniumWing;
  onWingChange?: (wing: ProsceniumWing) => void;
}

const WINGS: {
  id: ProsceniumWing;
  label: string;
  note: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "stage",
    label: "Stage",
    note: "Transmissions & resonance",
    icon: <Radio size={12} />,
  },
  {
    id: "correspondents",
    label: "Correspondents",
    note: "Follows & connections",
    icon: <Users size={12} />,
  },
  {
    id: "cliques",
    label: "Cliques",
    note: "Named inner circles",
    icon: <Layers size={12} />,
  },
];

const DEMO_TRANSMISSIONS: Transmission[] = [
  {
    id: "sim_1",
    userId: "ghost",
    userHandle: "oracle",
    content: "The aesthetic is not a choice, it is a biological imperative.",
    imageUrl: "https://picsum.photos/seed/mimi1/800/1200?blur=2",
    timestamp: Date.now(),
    type: "manifest",
    likes: 42,
    vibeNotes: [],
    isDemo: true,
    zineData: {
      id: "mock_1",
      title: "Biological Imperative",
      content: "",
      isPublic: true,
      mask: { typographyIntent: { archetype: "minimalist-sans" } },
    } as unknown as ZineMetadata,
  },
  {
    id: "sim_2",
    userId: "user1",
    userHandle: "velvet_void",
    content: "Refracting the mundane through a lens of hyper-nostalgia.",
    imageUrl: "https://picsum.photos/seed/mimi2/800/1200?grayscale",
    timestamp: Date.now() - 100000,
    type: "manifest",
    likes: 12,
    vibeNotes: [],
    isDemo: true,
    zineData: {
      id: "mock_2",
      title: "Hyper Nostalgia",
      content: "",
      isPublic: true,
      mask: { typographyIntent: { archetype: "editorial-serif" } },
    } as unknown as ZineMetadata,
  },
  {
    id: "sim_3",
    userId: "user2",
    userHandle: "chrome_heart",
    content: "Silence is the loudest texture.",
    imageUrl: "https://picsum.photos/seed/mimi3/800/1200",
    timestamp: Date.now() - 200000,
    type: "echo",
    likes: 8,
    vibeNotes: [],
    isDemo: true,
    zineData: {
      id: "mock_3",
      title: "Loudest Texture",
      content: "",
      isPublic: true,
      mask: { typographyIntent: { archetype: "brutalist-mono" } },
    } as unknown as ZineMetadata,
  },
];

function parseWing(value?: string | null): ProsceniumWing {
  if (value === "correspondents" || value === "connections" || value === "circle") {
    return "correspondents";
  }
  if (value === "cliques" || value === "clique") return "cliques";
  return "stage";
}

export const ProsceniumView: React.FC<ProsceniumViewProps> = ({
  onSelectZine,
  initialWing = "stage",
  onWingChange,
}) => {
  const { user, profile, loading } = useUser();
  const [wing, setWing] = useState<ProsceniumWing>(parseWing(initialWing));
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [activeChannel, setActiveChannel] = useState<
    "global" | "following" | "local"
  >("global");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Transmission | null>(
    null,
  );
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [newVibeNote, setNewVibeNote] = useState("");
  const [isSubmittingVibe, setIsSubmittingVibe] = useState(false);
  const [transmittedId, setTransmittedId] = useState<string | null>(null);
  const [localTransmissions, setLocalTransmissions] =
    useState<Transmission[]>(DEMO_TRANSMISSIONS);
  const [entered, setEntered] = useState(initialWing !== "stage");

  useEffect(() => {
    setWing(parseWing(initialWing));
    if (initialWing && initialWing !== "stage") setEntered(true);
  }, [initialWing]);

  const selectWing = useCallback(
    (next: ProsceniumWing) => {
      setWing(next);
      setEntered(true);
      onWingChange?.(next);
      window.dispatchEvent(
        new CustomEvent("mimi:sound", { detail: { type: "transition" } }),
      );
    },
    [onWingChange],
  );

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToFollowing(user.uid, (connections) => {
      setFollowingIds(connections.map((c) => c.followingId));
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (loading || wing !== "stage") return;

    if (isOfflineMode || activeChannel === "local") {
      setTransmissions(localTransmissions);
      return;
    }

    const q = query(
      collection(db, "public_transmissions"),
      orderBy("timestamp", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            isDemo: false,
            timestamp: raw.timestamp?.toMillis
              ? raw.timestamp.toMillis()
              : Date.now(),
          } as Transmission;
        });

        if (activeChannel === "following") {
          data = data.filter((t) => followingIds.includes(t.userId));
        }

        setTransmissions(data);

        if (selectedArtifact) {
          const updated = data.find((t) => t.id === selectedArtifact.id);
          if (updated) setSelectedArtifact(updated);
        }

        setIsOfflineMode(false);
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, "public_transmissions");
        setIsOfflineMode(true);
        setTransmissions(localTransmissions);
      },
    );

    return () => unsubscribe();
  }, [
    loading,
    isOfflineMode,
    localTransmissions,
    activeChannel,
    followingIds,
    selectedArtifact?.id,
    wing,
  ]);

  const handleWitness = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOfflineMode || activeChannel === "local") {
      setTransmissions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, likes: t.likes + 1 } : t)),
      );
      setLocalTransmissions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, likes: t.likes + 1 } : t)),
      );
      return;
    }

    try {
      window.dispatchEvent(
        new CustomEvent("mimi:sound", { detail: { type: "shimmer" } }),
      );
      const ref = doc(db, "public_transmissions", id);
      await updateDoc(ref, { likes: increment(1) });
    } catch (err) {
      console.error("Witness failed:", err);
    }
  };

  const handleAbsorb = (t: Transmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("mimi:sound", { detail: { type: "transition" } }),
    );
    if (t.zineData && onSelectZine) {
      onSelectZine(t.zineData);
    } else {
      setSelectedArtifact(t);
    }
  };

  const handleAbsorbToStudio = async (t: Transmission) => {
    if (!t.zineData || !user) return;
    try {
      const { absorbTransmission } = await import("../services/firebaseUtils");
      const folderId = await absorbTransmission(user.uid, t.zineData);
      if (folderId) {
        window.dispatchEvent(
          new CustomEvent("mimi:change_view", {
            detail: "dossier",
            detail_data: { folderId },
          } as CustomEventInit),
        );
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Manifest Absorbed into Dossier.",
              icon: <Zap size={14} />,
            },
          }),
        );
      }
    } catch (err) {
      console.error("Failed to absorb", err);
    }
  };

  const handleRemix = (t: Transmission) => {
    if (!t.zineData || !user) return;
    window.dispatchEvent(
      new CustomEvent("mimi:change_view", {
        detail: "studio",
        detail_data: { action: "remix", zineData: t.zineData },
      } as CustomEventInit),
    );
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: "Shards loaded for Remix.",
          icon: <Zap size={14} />,
        },
      }),
    );
  };

  const handleOpenProfile = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setViewingProfileId(userId);
  };

  const handleAddVibeNote = async () => {
    if (!user || !profile || !selectedArtifact || !newVibeNote.trim()) return;
    setIsSubmittingVibe(true);
    const note: VibeNote = {
      id: `vibe_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: user.uid,
      userHandle: profile.handle,
      note: newVibeNote.trim(),
      timestamp: Date.now(),
    };

    try {
      if (isOfflineMode || activeChannel === "local") {
        const updatedArtifact = {
          ...selectedArtifact,
          vibeNotes: [...(selectedArtifact.vibeNotes || []), note],
        };
        setLocalTransmissions((prev) =>
          prev.map((t) =>
            t.id === selectedArtifact.id ? updatedArtifact : t,
          ),
        );
        setSelectedArtifact(updatedArtifact);
      } else {
        const ref = doc(db, "public_transmissions", selectedArtifact.id);
        await updateDoc(ref, { vibeNotes: arrayUnion(note) });
      }
      setNewVibeNote("");
    } catch (err) {
      console.error("Failed to add vibe note:", err);
    } finally {
      setIsSubmittingVibe(false);
    }
  };

  const showingDemo =
    isOfflineMode ||
    activeChannel === "local" ||
    transmissions.every((t) => t.isDemo);

  const channelLabel = isOfflineMode
    ? "Demonstration specimens"
    : activeChannel === "following"
      ? "Resonant Field"
      : activeChannel === "local"
        ? "Local Echoes · demo"
        : "Live Exhibition";

  return (
    <PublicField className="flex-1 w-full h-full overflow-y-auto no-scrollbar">
      {/* Atmospheric arch field — grain + soft radial, not a cream wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(90,90,64,0.07),transparent_55%),radial-gradient(ellipse_at_80%_20%,rgba(155,184,206,0.12),transparent_40%)]" />
        <motion.div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[140%] h-48 opacity-[0.14]"
          initial={{ scaleY: 1.15, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 0.14 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:
              "linear-gradient(180deg, #0a0a0a 0%, transparent 100%)",
            clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-20 pb-32">
        {/* Hero — full composition on Stage entry; compact masthead in other wings */}
        <motion.header
          layout
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          data-testid="proscenium-hero"
          className={`relative flex flex-col justify-end mb-4 ${
            wing === "stage" && !entered
              ? "min-h-[min(72vh,640px)] pb-10"
              : wing === "stage"
                ? "min-h-[min(42vh,420px)] pb-8"
                : "pb-6 pt-2"
          }`}
        >
          <div
            className={`flex items-start justify-between gap-4 ${
              wing === "stage" ? "absolute top-0 left-0 right-0" : ""
            }`}
          >
            <PressMark label="Proscenium" tone="olive" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]"
            >
              {isOfflineMode ? (
                <WifiOff size={10} />
              ) : (
                <Eye size={10} className="animate-pulse" />
              )}
              {wing === "stage" ? channelLabel : WINGS.find((w) => w.id === wing)?.label}
            </motion.div>
          </div>

          {wing === "stage" ? (
            <div className="space-y-6 max-w-2xl pt-16">
              <MimiWordmark size="lg" as="p" />
              <h1 className="font-serif italic text-5xl md:text-7xl tracking-tighter leading-[0.92] text-[var(--mimi-ink,#0a0a0a)]">
                The Proscenium.
              </h1>
              <p className="font-serif italic text-lg md:text-xl text-[var(--mimi-stone,#78716c)] leading-relaxed border-l border-[var(--mimi-olive,#5A5A40)] pl-5 max-w-xl">
                Published encounters under one arch — transmissions, correspondents,
                and cliques after The Press. Not a feed.
              </p>
              {!entered && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <PublicCTA onClick={() => selectWing("stage")}>
                    Enter the Stage <ArrowRight size={12} />
                  </PublicCTA>
                  <PublicCTA
                    variant="ghost"
                    onClick={() => selectWing("correspondents")}
                  >
                    Correspondents
                  </PublicCTA>
                  <PublicCTA
                    variant="ghost"
                    onClick={() => selectWing("cliques")}
                  >
                    Cliques
                  </PublicCTA>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl pt-10 md:pt-12">
              <MimiWordmark size="md" as="p" />
              <h1 className="font-serif italic text-4xl md:text-5xl tracking-tighter leading-none text-[var(--mimi-ink,#0a0a0a)]">
                The Proscenium.
              </h1>
              <p className="font-serif italic text-base text-[var(--mimi-stone,#78716c)] max-w-lg">
                {wing === "correspondents"
                  ? "Manage soft follows and mutual consonants beneath the arch."
                  : "Named invite-only circles for boards, critique, and collab seats."}
              </p>
            </div>
          )}
        </motion.header>

        <ColumnRule className="mb-8" />

        {/* Wing nav */}
        <nav
          aria-label="Proscenium wings"
          data-testid="proscenium-wings"
          className="sticky top-0 z-20 -mx-2 px-2 py-3 mb-10 bg-[var(--mimi-field,#ffffff)]/90 backdrop-blur-sm border-b border-[var(--mimi-hairline,#d4d4d4)]"
        >
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {WINGS.map((w) => {
              const active = wing === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  data-testid={`proscenium-wing-${w.id}`}
                  onClick={() => selectWing(w.id)}
                  className={`relative pb-2 flex items-center gap-2 transition-colors ${
                    active
                      ? "text-[var(--mimi-ink,#0a0a0a)]"
                      : "text-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)]"
                  }`}
                >
                  {w.icon}
                  <span className="font-sans text-[10px] uppercase tracking-[0.24em] font-semibold">
                    {w.label}
                  </span>
                  <span className="hidden md:inline font-serif italic text-xs opacity-50">
                    {w.note}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="proscenium-wing-rule"
                      className="absolute left-0 right-0 -bottom-px h-px bg-[var(--mimi-ink,#0a0a0a)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {wing === "stage" && (
            <motion.section
              key="stage"
              initial={{ opacity: 0, y: entered ? 12 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="space-y-10"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--mimi-olive,#5A5A40)] mb-1">
                    pro·sce·ni·um
                  </p>
                  <p className="font-serif italic text-[var(--mimi-stone,#78716c)] max-w-md">
                    Witness manifested visions. Resonate, absorb, refract.
                  </p>
                </div>
                <div className="flex gap-5">
                  {(
                    [
                      ["global", "Global"],
                      ...(user ? [["following", "Resonant Field"] as const] : []),
                      ["local", "Local Echoes"],
                    ] as [typeof activeChannel, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveChannel(id)}
                      className={`font-sans text-[9px] uppercase tracking-[0.2em] font-semibold pb-1 border-b transition-colors ${
                        activeChannel === id
                          ? "text-[var(--mimi-ink,#0a0a0a)] border-[var(--mimi-ink,#0a0a0a)]"
                          : "text-[var(--mimi-stone,#78716c)] border-transparent hover:text-[var(--mimi-ink,#0a0a0a)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {showingDemo && (
                <div className="flex items-center gap-3 py-3 border-y border-[var(--mimi-hairline,#d4d4d4)]">
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 bg-[var(--mimi-cobalt,#9BB8CE)]"
                  />
                  <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold">
                    {isOfflineMode || activeChannel === "local"
                      ? "Demonstration specimens — not live resonance"
                      : "Showing available transmissions"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--mimi-hairline,#d4d4d4)] border border-[var(--mimi-hairline,#d4d4d4)]">
                <AnimatePresence>
                  {transmissions.map((t, i) => (
                    <motion.article
                      key={t.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: Math.min(i * 0.05, 0.35) }}
                      onClick={() => handleAbsorb(t)}
                      className="group relative aspect-[3/4] bg-[var(--mimi-worktable,#fafafa)] overflow-hidden cursor-pointer"
                    >
                      {t.imageUrl ? (
                        <img
                          src={t.imageUrl}
                          alt={t.content}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-8">
                          <p className="font-serif text-2xl italic text-center text-[var(--mimi-stone,#78716c)]">
                            "{t.content}"
                          </p>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                        <div className="translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`w-1.5 h-1.5 ${
                                t.type === "signal"
                                  ? "bg-[var(--mimi-cobalt,#9BB8CE)]"
                                  : t.type === "manifest"
                                    ? "bg-[var(--mimi-olive,#5A5A40)]"
                                    : "bg-stone-400"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleOpenProfile(t.userId, e)}
                              className="font-sans text-[8px] uppercase tracking-widest font-semibold text-white/70 hover:text-white"
                            >
                              {t.userHandle}
                            </button>
                            {t.isDemo && (
                              <span className="font-mono text-[7px] uppercase tracking-widest text-white/40">
                                [demo]
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-lg italic text-white leading-tight mb-4 line-clamp-2">
                            {t.content}
                          </p>
                          <div className="flex items-center gap-4 text-white/70">
                            <button
                              type="button"
                              onClick={(e) => handleWitness(t.id, e)}
                              className="flex items-center gap-1.5 hover:text-white transition-colors"
                            >
                              <Eye size={12} />
                              <span className="font-mono text-[9px] uppercase tracking-widest">
                                Resonate ({t.likes})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleAbsorb(t, e)}
                              className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto"
                            >
                              <Maximize2 size={12} />
                              <span className="font-mono text-[9px] uppercase tracking-widest">
                                Absorb
                              </span>
                            </button>
                          </div>
                          {t.zineData && (
                            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAbsorbToStudio(t);
                                }}
                                className="font-sans text-[8px] uppercase tracking-widest font-semibold text-white hover:text-[var(--mimi-cobalt,#9BB8CE)]"
                              >
                                Absorb Transmission
                              </button>
                              {t.zineData.isLocked ? (
                                <span className="font-mono text-[8px] uppercase opacity-50 text-white">
                                  Sealed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemix(t);
                                  }}
                                  className="font-sans text-[8px] uppercase tracking-widest font-semibold text-white hover:text-[var(--mimi-cobalt,#9BB8CE)]"
                                >
                                  Refract
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              {transmissions.length === 0 && (
                <div className="text-center py-28 space-y-3">
                  <p className="font-serif text-2xl italic text-[var(--mimi-stone,#78716c)]">
                    The gallery is empty.
                  </p>
                  <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
                    Stage a transmission from Studio, or open Local Echoes.
                  </p>
                </div>
              )}
            </motion.section>
          )}

          {wing === "correspondents" && (
            <motion.section
              key="correspondents"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="max-w-3xl"
            >
              <div className="mb-8 space-y-2">
                <PressMark label="Circle" tone="cobalt" />
                <h2 className="font-serif italic text-3xl md:text-4xl tracking-tighter text-[var(--mimi-ink,#0a0a0a)]">
                  Correspondents.
                </h2>
                <p className="font-serif italic text-[var(--mimi-stone,#78716c)]">
                  Soft follows and mutual consonants — the people whose Stand
                  you keep on the Floor.
                </p>
              </div>
              <ConnectionsManager embedded />
            </motion.section>
          )}

          {wing === "cliques" && (
            <motion.section
              key="cliques"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="max-w-3xl"
            >
              <div className="mb-8 space-y-2">
                <PressMark label="Inner Circle" tone="olive" />
                <h2 className="font-serif italic text-3xl md:text-4xl tracking-tighter text-[var(--mimi-ink,#0a0a0a)]">
                  Cliques.
                </h2>
              </div>
              <CliqueView
                embedded
                onOpenCorrespondents={() => selectWing("correspondents")}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Artifact modal */}
      <AnimatePresence>
        {selectedArtifact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedArtifact(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col md:flex-row bg-[var(--mimi-ink,#0a0a0a)] border border-white/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative">
                {selectedArtifact.imageUrl ? (
                  <img
                    src={selectedArtifact.imageUrl}
                    alt="Artifact"
                    className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="p-12 text-center">
                    <p className="font-serif text-4xl italic text-white/50">
                      "{selectedArtifact.content}"
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto max-h-[50vh] md:max-h-[85vh] no-scrollbar">
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <span
                      className={`w-2 h-2 ${
                        selectedArtifact.type === "signal"
                          ? "bg-[var(--mimi-cobalt,#9BB8CE)]"
                          : "bg-[var(--mimi-olive,#5A5A40)]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(selectedArtifact.userId)}
                      className="font-sans text-[10px] uppercase tracking-widest font-semibold text-white/50 hover:text-white"
                    >
                      {selectedArtifact.userHandle}
                    </button>
                  </div>
                  <h2 className="font-serif text-3xl md:text-4xl italic text-white leading-tight mb-6">
                    {selectedArtifact.content}
                  </h2>
                  <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                    Archived:{" "}
                    {new Date(selectedArtifact.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={(e) => handleWitness(selectedArtifact.id, e)}
                    className="w-full py-4 border border-white/20 text-white font-sans text-[10px] uppercase tracking-[0.3em] font-semibold hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
                  >
                    <Eye size={14} /> Resonate ({selectedArtifact.likes})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = selectedArtifact.zineData?.id
                        ? `${window.location.origin}/?zine=${selectedArtifact.zineData.id}`
                        : window.location.href;
                      navigator.clipboard.writeText(shareUrl).catch(() => {});
                      setTransmittedId(selectedArtifact.id);
                      setTimeout(() => setTransmittedId(null), 3000);
                    }}
                    className="w-full py-4 bg-white/5 text-white/50 font-sans text-[10px] uppercase tracking-[0.3em] font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    {transmittedId === selectedArtifact.id ? (
                      <>
                        <Maximize2 size={14} /> Link Transmitted
                      </>
                    ) : (
                      <>
                        <Share2 size={14} /> Transmit
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-12 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-6 text-white/50">
                    <MessageSquare size={14} />
                    <span className="font-sans text-[10px] uppercase tracking-widest font-semibold">
                      Vibe Notes
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-6 no-scrollbar min-h-[100px]">
                    {!selectedArtifact.vibeNotes ||
                    selectedArtifact.vibeNotes.length === 0 ? (
                      <p className="font-serif italic text-white/30 text-sm">
                        No vibes recorded yet. Be the first.
                      </p>
                    ) : (
                      selectedArtifact.vibeNotes.map((note) => (
                        <div key={note.id} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(note.userId)}
                              className="font-sans text-[8px] uppercase tracking-widest font-semibold text-[var(--mimi-cobalt,#9BB8CE)] hover:text-white"
                            >
                              {note.userHandle}
                            </button>
                            <span className="font-mono text-[8px] text-white/30">
                              {new Date(note.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="font-serif text-sm text-white/80">
                            {note.note}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {user ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newVibeNote}
                        onChange={(e) => setNewVibeNote(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddVibeNote()
                        }
                        placeholder="Leave a vibe…"
                        className="flex-1 bg-white/5 border border-white/10 px-4 py-3 font-serif italic text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                      />
                      <button
                        type="button"
                        onClick={handleAddVibeNote}
                        disabled={isSubmittingVibe || !newVibeNote.trim()}
                        className="px-4 bg-[var(--mimi-olive,#5A5A40)]/30 text-[var(--mimi-cobalt,#9BB8CE)] border border-white/15 hover:bg-[var(--mimi-olive,#5A5A40)]/50 disabled:opacity-50 transition-colors flex items-center justify-center"
                      >
                        {isSubmittingVibe ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Zap size={14} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="font-sans text-[8px] uppercase tracking-widest text-white/30 text-center">
                      Sign in to leave a vibe note.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArtifact(null)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <Zap size={20} className="rotate-45" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfileId && (
          <PublicProfileModal
            userId={viewingProfileId}
            onClose={() => setViewingProfileId(null)}
            onSelectZine={onSelectZine}
          />
        )}
      </AnimatePresence>
    </PublicField>
  );
};
