import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "../contexts/UserContext";
import {
  Users,
  UserPlus,
  Trash2,
  Plus,
  X,
  Loader2,
  ChevronRight,
  Lock,
  Check,
  UserMinus,
  Layers,
  Radio,
  CircleDot,
  Briefcase,
} from "lucide-react";
import {
  Clique,
  createClique,
  deleteClique,
  subscribeToCliques,
  addMemberToClique,
  removeMemberFromClique,
} from "../services/cliques";
import {
  fetchFriends,
  fetchFollowing,
  Friendship,
  Connection,
} from "../services/connections";
import { getUserProfile } from "../services/firebaseUtils";
import { UserProfile } from "../types";
import { PublicCTA } from "./public-face/PublicCTA";

type CliqueRing = "follow" | "clique" | "collab";

const RING_COPY: Record<
  CliqueRing,
  { title: string; purpose: string; trust: string }
> = {
  follow: {
    title: "Follow",
    purpose: "Soft signal — see their Stand on Floor",
    trust: "Public",
  },
  clique: {
    title: "Clique",
    purpose: "Small private circle (3–12) for shared boards & critique",
    trust: "Invite",
  },
  collab: {
    title: "Collab seat",
    purpose: "Explicit project membership (Tailor / Studio brief)",
    trust: "Contractual",
  },
};

const MemberItem: React.FC<{
  userId: string;
  isOwner: boolean;
  isSelf: boolean;
  onRemove?: () => void;
}> = ({ userId, isOwner, isSelf, onRemove }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(userId)
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  if (!profile) {
    return (
      <div className="h-12 animate-pulse bg-[var(--mimi-worktable,#fafafa)]" />
    );
  }

  return (
    <div className="flex items-center justify-between py-3 gap-3 border-b border-[var(--mimi-hairline,#d4d4d4)] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)] shrink-0">
          <img
            src={
              profile.photoURL ||
              `https://ui-avatars.com/api/?name=${profile.handle || "U"}&background=0a0a0a&color=fff`
            }
            className="w-full h-full object-cover grayscale"
            alt=""
          />
        </div>
        <span className="font-serif italic text-sm text-[var(--mimi-ink,#0a0a0a)] truncate">
          @{profile.handle}
        </span>
        {isOwner && (
          <span className="font-sans text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-olive,#5A5A40)] font-semibold border border-[var(--mimi-olive,#5A5A40)]/40 px-1.5 py-0.5 shrink-0">
            Owner
          </span>
        )}
      </div>
      {!isSelf && onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-[var(--mimi-stone,#78716c)] hover:text-red-600 transition-colors"
          title="Remove from clique"
        >
          <UserMinus size={14} />
        </button>
      )}
    </div>
  );
};

const CorrespondentChip: React.FC<{ userId: string }> = ({ userId }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    getUserProfile(userId)
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  if (!profile) {
    return (
      <li className="h-10 animate-pulse bg-[var(--mimi-worktable,#fafafa)] border border-[var(--mimi-hairline,#d4d4d4)]" />
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 border border-[var(--mimi-hairline,#d4d4d4)]">
      <div className="w-7 h-7 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] shrink-0">
        <img
          src={
            profile.photoURL ||
            `https://ui-avatars.com/api/?name=${profile.handle || "U"}&background=0a0a0a&color=fff`
          }
          className="w-full h-full object-cover grayscale"
          alt=""
        />
      </div>
      <span className="font-serif italic text-sm text-[var(--mimi-ink,#0a0a0a)]">
        @{profile.handle}
      </span>
    </li>
  );
};

const CliqueDetail: React.FC<{
  clique: Clique;
  friends: (Friendship & { friendId: string })[];
  onBack: () => void;
  onDeleted: () => void;
}> = ({ clique, friends, onBack, onDeleted }) => {
  const { user } = useUser();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const nonMemberFriends = friends.filter(
    (f) => !clique.memberIds.includes(f.friendId),
  );

  const handleAdd = async (friendId: string) => {
    setActionLoading(friendId);
    try {
      await addMemberToClique(clique.id, friendId);
    } catch (e) {
      console.error("MIMI // addMember failed", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      await removeMemberFromClique(clique.id, memberId);
    } catch (e) {
      console.error("MIMI // removeMember failed", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${clique.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteClique(clique.id);
      onDeleted();
    } catch (e) {
      console.error("MIMI // deleteClique failed", e);
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-8"
    >
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2 text-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)] transition-colors"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif italic text-2xl md:text-3xl text-[var(--mimi-ink,#0a0a0a)] tracking-tight">
            {clique.name}
          </h3>
          {clique.description && (
            <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold mt-1">
              {clique.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAdding(!adding)}
            className={`flex items-center gap-2 px-3 py-2 border font-sans text-[8px] uppercase tracking-[0.2em] font-semibold transition-colors ${
              adding
                ? "bg-[var(--mimi-ink,#0a0a0a)] text-white border-[var(--mimi-ink,#0a0a0a)]"
                : "border-[var(--mimi-hairline,#d4d4d4)] text-[var(--mimi-ink,#0a0a0a)] hover:border-[var(--mimi-ink,#0a0a0a)]"
            }`}
          >
            <UserPlus size={12} /> Add
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-[var(--mimi-stone,#78716c)] hover:text-red-600 transition-colors"
            title="Delete clique"
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-[var(--mimi-hairline,#d4d4d4)] p-4 space-y-2 bg-[var(--mimi-worktable,#fafafa)]">
              <p className="font-sans text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold mb-3">
                Your connected friends
              </p>
              {nonMemberFriends.length === 0 ? (
                <p className="font-serif italic text-sm text-[var(--mimi-stone,#78716c)]">
                  {friends.length === 0
                    ? "Connect with people first to add them to cliques."
                    : "All your connections are already in this clique."}
                </p>
              ) : (
                nonMemberFriends.map((f) => (
                  <FriendAddItem
                    key={f.friendId}
                    userId={f.friendId}
                    loading={actionLoading === f.friendId}
                    onAdd={() => handleAdd(f.friendId)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="pb-3 mb-1 border-b border-[var(--mimi-hairline,#d4d4d4)]">
          <span className="font-sans text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold">
            {clique.memberIds.length} Member
            {clique.memberIds.length !== 1 ? "s" : ""}
          </span>
        </div>
        {clique.memberIds.map((mid) => (
          <MemberItem
            key={mid}
            userId={mid}
            isOwner={mid === clique.ownerId}
            isSelf={mid === user?.uid}
            onRemove={
              mid !== clique.ownerId ? () => handleRemove(mid) : undefined
            }
          />
        ))}
      </div>
    </motion.div>
  );
};

const FriendAddItem: React.FC<{
  userId: string;
  loading: boolean;
  onAdd: () => void;
}> = ({ userId, loading, onAdd }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(userId)
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  if (!profile) {
    return (
      <div className="h-10 animate-pulse bg-[var(--mimi-worktable,#fafafa)]" />
    );
  }

  return (
    <div className="flex items-center justify-between py-2 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] shrink-0">
          <img
            src={
              profile.photoURL ||
              `https://ui-avatars.com/api/?name=${profile.handle || "U"}&background=0a0a0a&color=fff`
            }
            className="w-full h-full object-cover grayscale"
            alt=""
          />
        </div>
        <span className="font-serif italic text-sm text-[var(--mimi-ink,#0a0a0a)] truncate">
          @{profile.handle}
        </span>
      </div>
      <button
        onClick={onAdd}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--mimi-ink,#0a0a0a)] text-white font-sans text-[7px] uppercase tracking-[0.2em] font-semibold hover:opacity-80 disabled:opacity-50 transition-opacity"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
        Add
      </button>
    </div>
  );
};

export type CliqueViewProps = {
  embedded?: boolean;
  /** Jump into correspondents wing when Follow ring needs management */
  onOpenCorrespondents?: () => void;
};

export const CliqueView: React.FC<CliqueViewProps> = ({
  embedded = false,
  onOpenCorrespondents,
}) => {
  const { user } = useUser();
  const [cliques, setCliques] = useState<Clique[]>([]);
  const [friends, setFriends] = useState<(Friendship & { friendId: string })[]>(
    [],
  );
  const [following, setFollowing] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedClique, setSelectedClique] = useState<Clique | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [activeRing, setActiveRing] = useState<CliqueRing>("clique");

  useEffect(() => {
    if (!user?.uid || user.isAnonymous) {
      setLoading(false);
      return;
    }
    setLoadError(false);
    const unsub = subscribeToCliques(
      user.uid,
      (data) => {
        setCliques(data.sort((a, b) => b.createdAt - a.createdAt));
        setLoadError(false);
        setLoading(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid, user?.isAnonymous]);

  useEffect(() => {
    if (!user?.uid || user.isAnonymous) return;
    fetchFriends(user.uid)
      .then(setFriends)
      .catch(() => {});
    fetchFollowing(user.uid)
      .then(setFollowing)
      .catch(() => {});
  }, [user?.uid, user?.isAnonymous]);

  useEffect(() => {
    if (selectedClique) {
      const updated = cliques.find((c) => c.id === selectedClique.id);
      if (updated) setSelectedClique(updated);
      else setSelectedClique(null);
    }
  }, [cliques, selectedClique?.id]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const clique = await createClique(newName, newDesc);
      if (clique) {
        setCreating(false);
        setNewName("");
        setNewDesc("");
        setActiveRing("clique");
      }
    } catch (e) {
      console.error("MIMI // createClique failed", e);
    } finally {
      setCreateLoading(false);
    }
  };

  const openCorrespondents = () => {
    if (onOpenCorrespondents) {
      onOpenCorrespondents();
      return;
    }
    window.dispatchEvent(
      new CustomEvent("mimi:change_view", { detail: "proscenium/correspondents" }),
    );
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center space-y-8">
        <Lock size={36} className="text-[var(--mimi-ink,#0a0a0a)]" />
        <div className="space-y-3">
          <h3 className="font-serif text-3xl italic tracking-tighter text-[var(--mimi-ink,#0a0a0a)]">
            Identity Required.
          </h3>
          <p className="font-serif italic text-base text-[var(--mimi-stone,#78716c)] max-w-sm">
            Anchor your identity to create and manage cliques.
          </p>
        </div>
        <PublicCTA
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mimi:change_view", { detail: "profile" }),
            )
          }
        >
          Anchor Identity
        </PublicCTA>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin text-[var(--mimi-stone,#78716c)]" />
        <span className="font-sans text-[8px] uppercase tracking-[0.4em] text-[var(--mimi-stone,#78716c)] font-semibold">
          Loading cliques…
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-center px-6">
        <span className="font-serif text-2xl italic tracking-tighter text-[var(--mimi-ink,#0a0a0a)]">
          Unable to load cliques.
        </span>
        <span className="font-sans text-[8px] uppercase tracking-[0.35em] text-[var(--mimi-stone,#78716c)] font-semibold">
          Please try again later.
        </span>
      </div>
    );
  }

  const ringCounts: Record<CliqueRing, number> = {
    follow: following.length,
    clique: cliques.length,
    collab: cliques.reduce(
      (n, c) => n + Math.max(0, (c.memberIds?.length || 1) - 1),
      0,
    ),
  };

  const body = (
    <div className="space-y-10">
      {!embedded && (
        <header className="space-y-4 pb-8 border-b border-[var(--mimi-hairline,#d4d4d4)]">
          <div className="flex items-center gap-3 text-[var(--mimi-olive,#5A5A40)]">
            <Layers size={14} />
            <span className="font-sans text-[9px] uppercase tracking-[0.35em] font-semibold">
              Social Architecture
            </span>
          </div>
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="font-serif text-5xl md:text-6xl italic tracking-tighter text-[var(--mimi-ink,#0a0a0a)] leading-none">
                Cliques.
              </h2>
              <p className="font-serif italic text-base text-[var(--mimi-stone,#78716c)] max-w-md">
                Three concentric rings — Follow, Clique, Collab seat — not a feed.
              </p>
            </div>
            <button
              onClick={() => setCreating(!creating)}
              className={`flex items-center gap-2 px-5 py-3 border font-sans text-[8px] uppercase tracking-[0.2em] font-semibold shrink-0 transition-colors ${
                creating
                  ? "bg-[var(--mimi-ink,#0a0a0a)] text-white border-[var(--mimi-ink,#0a0a0a)]"
                  : "border-[var(--mimi-hairline,#d4d4d4)] text-[var(--mimi-ink,#0a0a0a)] hover:border-[var(--mimi-ink,#0a0a0a)]"
              }`}
            >
              {creating ? <X size={14} /> : <Plus size={14} />}
              {creating ? "Cancel" : "New Clique"}
            </button>
          </div>
        </header>
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-4">
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)] text-sm max-w-md">
            Named circles for shared boards and critique — invite only.
          </p>
          <button
            onClick={() => setCreating(!creating)}
            className={`flex items-center gap-2 px-4 py-2.5 border font-sans text-[8px] uppercase tracking-[0.2em] font-semibold shrink-0 transition-colors ${
              creating
                ? "bg-[var(--mimi-ink,#0a0a0a)] text-white border-[var(--mimi-ink,#0a0a0a)]"
                : "border-[var(--mimi-hairline,#d4d4d4)] text-[var(--mimi-ink,#0a0a0a)] hover:border-[var(--mimi-ink,#0a0a0a)]"
            }`}
          >
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "Cancel" : "New Clique"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--mimi-hairline,#d4d4d4)] border border-[var(--mimi-hairline,#d4d4d4)]">
        {(["follow", "clique", "collab"] as CliqueRing[]).map((ring, index) => {
          const copy = RING_COPY[ring];
          const active = activeRing === ring;
          const Icon =
            ring === "follow" ? Radio : ring === "clique" ? CircleDot : Briefcase;
          return (
            <button
              key={ring}
              type="button"
              onClick={() => setActiveRing(ring)}
              className={`text-left p-5 transition-colors ${
                active
                  ? "bg-[var(--mimi-ink,#0a0a0a)] text-white"
                  : "bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] hover:bg-[var(--mimi-worktable,#fafafa)]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`font-mono text-[8px] uppercase tracking-[0.3em] ${
                    active ? "opacity-60" : "text-[var(--mimi-stone,#78716c)]"
                  }`}
                >
                  Ring 0{index + 1}
                </span>
                <Icon size={14} />
              </div>
              <p className="font-serif italic text-2xl leading-none mb-2">
                {copy.title}
              </p>
              <p
                className={`font-sans text-[11px] leading-relaxed mb-4 ${
                  active ? "opacity-70" : "text-[var(--mimi-stone,#78716c)]"
                }`}
              >
                {copy.purpose}
              </p>
              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-widest opacity-70">
                <span>{copy.trust}</span>
                <span>{ringCounts[ring]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeRing === "follow" && (
        <div className="space-y-5">
          <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-olive,#5A5A40)] font-semibold">
            Correspondents you follow
          </p>
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)] text-sm max-w-xl">
            Follow is a soft signal — their Stand appears on Floor. Manage
            follows in Correspondents.
          </p>
          <div className="flex flex-wrap gap-2">
            <PublicCTA onClick={openCorrespondents}>Open Correspondents</PublicCTA>
            <PublicCTA
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", { detail: "stand" }),
                )
              }
            >
              View Floor / Stand
            </PublicCTA>
          </div>
          {following.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {following.slice(0, 12).map((c) => (
                <CorrespondentChip
                  key={c.id || c.followingId}
                  userId={c.followingId}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {activeRing === "collab" && (
        <div className="space-y-5">
          <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-[var(--mimi-olive,#5A5A40)] font-semibold">
            Collab seats
          </p>
          <p className="font-serif italic text-[var(--mimi-stone,#78716c)] text-sm max-w-xl">
            A collab seat is project membership — Tailor evidence and Studio
            briefs stay contractual, not public Follow noise.
          </p>
          <div className="flex flex-wrap gap-2">
            <PublicCTA
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", { detail: "moodboard" }),
                )
              }
            >
              Shared moodboard
            </PublicCTA>
            <PublicCTA
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mimi:change_view", {
                    detail: "tailor/evidence",
                  }),
                )
              }
            >
              Tailor project
            </PublicCTA>
            <PublicCTA variant="ghost" onClick={() => setActiveRing("clique")}>
              Invite via Clique →
            </PublicCTA>
          </div>
        </div>
      )}

      {activeRing === "clique" && (
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border border-[var(--mimi-hairline,#d4d4d4)] p-6 space-y-4 bg-[var(--mimi-worktable,#fafafa)]">
                <p className="font-sans text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold">
                  New Clique
                </p>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Clique name…"
                  maxLength={60}
                  className="w-full px-0 py-3 bg-transparent border-b border-[var(--mimi-hairline,#d4d4d4)] font-serif italic text-[var(--mimi-ink,#0a0a0a)] placeholder:text-[var(--mimi-stone,#78716c)]/50 focus:outline-none focus:border-[var(--mimi-ink,#0a0a0a)]"
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)…"
                  maxLength={120}
                  className="w-full px-0 py-3 bg-transparent border-b border-[var(--mimi-hairline,#d4d4d4)] font-serif italic text-sm text-[var(--mimi-ink,#0a0a0a)] placeholder:text-[var(--mimi-stone,#78716c)]/50 focus:outline-none focus:border-[var(--mimi-ink,#0a0a0a)]"
                />
                <PublicCTA
                  onClick={handleCreate}
                  disabled={!newName.trim() || createLoading}
                >
                  {createLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  Create Clique
                </PublicCTA>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {activeRing === "clique" && (
        <AnimatePresence mode="wait">
          {selectedClique ? (
            <CliqueDetail
              key={selectedClique.id}
              clique={selectedClique}
              friends={friends}
              onBack={() => setSelectedClique(null)}
              onDeleted={() => setSelectedClique(null)}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0"
            >
              {cliques.length === 0 ? (
                <div className="py-20 text-center space-y-5">
                  <Users
                    size={40}
                    className="mx-auto text-[var(--mimi-stone,#78716c)] opacity-40"
                  />
                  <p className="font-serif italic text-lg text-[var(--mimi-stone,#78716c)]">
                    No cliques yet. Create your first one.
                  </p>
                </div>
              ) : (
                cliques.map((clique, i) => (
                  <motion.button
                    key={clique.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedClique(clique)}
                    className="w-full flex items-center justify-between py-5 border-b border-[var(--mimi-hairline,#d4d4d4)] text-left group"
                  >
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-serif italic text-xl text-[var(--mimi-ink,#0a0a0a)] group-hover:text-[var(--mimi-olive,#5A5A40)] transition-colors truncate">
                        {clique.name}
                      </h4>
                      {clique.description && (
                        <p className="font-sans text-[8px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)] font-semibold truncate">
                          {clique.description}
                        </p>
                      )}
                      <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]/70">
                        {clique.memberIds.length} member
                        {clique.memberIds.length !== 1 ? "s" : ""} ·{" "}
                        {new Date(clique.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-[var(--mimi-stone,#78716c)] group-hover:text-[var(--mimi-ink,#0a0a0a)] transition-colors shrink-0"
                    />
                  </motion.button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar bg-[var(--mimi-field,#ffffff)] pb-32">
      <div className="w-full max-w-3xl mx-auto px-6 md:px-12 pt-12 md:pt-20">
        {body}
      </div>
    </div>
  );
};
