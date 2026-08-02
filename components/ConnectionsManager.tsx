import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserPlus,
  UserMinus,
  Check,
  X,
  Loader2,
  Users,
  Heart,
  ArrowRight,
  Search,
  Handshake,
  Clock,
  Link2Off,
  Zap,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import {
  fetchFollowers,
  fetchFollowing,
  fetchFriends,
  fetchFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  unfollowUser,
  Friendship,
  FriendRequest,
  Connection,
  sendFriendRequest,
  followUser,
  checkConnectionStatus,
} from "../services/connections";
import { getUserProfile, searchUsers } from "../services/firebaseUtils";
import { UserProfile } from "../types";
import { ColumnRule } from "./public-face/ColumnRule";
import { PublicCTA } from "./public-face/PublicCTA";

interface ConnectionItemProps {
  userId: string;
  type: "friend" | "follower" | "following" | "request" | "search";
  requestId?: string;
  onActionComplete: () => void;
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({
  userId,
  type,
  requestId,
  onActionComplete,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: string;
    requestId: string | null;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const p = await getUserProfile(userId);
        setProfile(p);
        if (type === "search") {
          const status = await checkConnectionStatus(userId);
          setConnectionStatus(status);
        }
      } catch (e) {
        console.error("MIMI // Failed to load connection data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, type]);

  const run = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
      onActionComplete();
    } catch (e) {
      console.error("MIMI // Connection action failed", e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-16 animate-pulse bg-[var(--mimi-worktable,#fafafa)] border-b border-[var(--mimi-hairline,#d4d4d4)]" />
    );
  }
  if (!profile) return null;

  const statusIcon = () => {
    if (type === "friend" || connectionStatus?.status === "friends") {
      return <Handshake size={12} className="text-[var(--mimi-olive,#5A5A40)]" />;
    }
    if (
      type === "request" ||
      connectionStatus?.status === "request_sent" ||
      connectionStatus?.status === "request_received"
    ) {
      return <Clock size={12} className="text-[var(--mimi-stone,#78716c)] animate-pulse" />;
    }
    if (type === "following") {
      return <Zap size={12} className="text-[var(--mimi-cobalt-deep,#6A8AA4)]" />;
    }
    if (type === "search" && connectionStatus?.status === "none") {
      return <Link2Off size={12} className="text-[var(--mimi-stone,#78716c)]" />;
    }
    return null;
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[var(--mimi-hairline,#d4d4d4)] group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 shrink-0 overflow-hidden border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-worktable,#fafafa)]">
          <img
            src={
              profile.photoURL ||
              `https://ui-avatars.com/api/?name=${profile.handle || "U"}&background=0a0a0a&color=fff`
            }
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500"
            alt=""
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-serif italic text-base text-[var(--mimi-ink,#0a0a0a)] truncate">
              @{profile.handle}
            </h4>
            {statusIcon()}
          </div>
          <p className="font-sans text-[8px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)] font-semibold">
            {type === "follower" ? "Resonant" : "Correspondent"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {type === "request" ? (
          <>
            <button
              onClick={() =>
                run(async () => {
                  if (!requestId) return;
                  await acceptFriendRequest(requestId, userId);
                })
              }
              disabled={actionLoading}
              className="p-2 text-[var(--mimi-olive,#5A5A40)] hover:bg-[var(--mimi-worktable,#fafafa)] transition-colors"
              title="Accept"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button
              onClick={() =>
                run(async () => {
                  if (!requestId) return;
                  await rejectFriendRequest(requestId);
                })
              }
              disabled={actionLoading}
              className="p-2 text-[var(--mimi-stone,#78716c)] hover:text-red-600 transition-colors"
              title="Decline"
            >
              <X size={16} />
            </button>
          </>
        ) : type === "friend" ? (
          <button
            onClick={() => run(() => removeFriend(userId))}
            disabled={actionLoading}
            className="p-2 text-[var(--mimi-stone,#78716c)] hover:text-red-600 transition-colors"
            title="Disconnect"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2Off size={16} />}
          </button>
        ) : type === "following" ? (
          <button
            onClick={() => run(() => unfollowUser(userId))}
            disabled={actionLoading}
            className="p-2 text-[var(--mimi-stone,#78716c)] hover:text-red-600 transition-colors"
            title="Stop resonating"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={16} />}
          </button>
        ) : type === "search" ? (
          connectionStatus?.status === "friends" ? (
            <span className="p-2 text-[var(--mimi-olive,#5A5A40)]" title="Connected">
              <Handshake size={16} />
            </span>
          ) : connectionStatus?.status === "request_sent" ? (
            <span className="p-2 text-[var(--mimi-stone,#78716c)] animate-pulse" title="Request sent">
              <Clock size={16} />
            </span>
          ) : connectionStatus?.status === "request_received" ? (
            <button
              onClick={() =>
                run(async () => {
                  if (!connectionStatus.requestId) return;
                  await acceptFriendRequest(connectionStatus.requestId, userId);
                })
              }
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--mimi-ink,#0a0a0a)] text-white font-sans text-[8px] uppercase tracking-[0.2em] font-semibold"
            >
              <Check size={10} /> Accept
            </button>
          ) : (
            <>
              <button
                onClick={() => run(() => sendFriendRequest(userId))}
                disabled={actionLoading}
                className="p-2 bg-[var(--mimi-ink,#0a0a0a)] text-white hover:bg-[var(--mimi-stone,#78716c)] transition-colors"
                title="Connect"
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
              </button>
              <button
                onClick={() => run(() => followUser(userId))}
                disabled={actionLoading}
                className="p-2 border border-[var(--mimi-hairline,#d4d4d4)] text-[var(--mimi-stone,#78716c)] hover:border-[var(--mimi-ink,#0a0a0a)] hover:text-[var(--mimi-ink,#0a0a0a)] transition-colors"
                title="Resonate"
              >
                <Zap size={16} />
              </button>
            </>
          )
        ) : null}
      </div>
    </div>
  );
};

export type ConnectionsManagerProps = {
  /** Hide outer page chrome when mounted inside Proscenium */
  embedded?: boolean;
};

export const ConnectionsManager: React.FC<ConnectionsManagerProps> = ({
  embedded = false,
}) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<
    "friends" | "requests" | "followers" | "following" | "search"
  >("friends");
  const [friends, setFriends] = useState<(Friendship & { friendId: string })[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [followers, setFollowers] = useState<Connection[]>([]);
  const [following, setFollowing] = useState<Connection[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [noAuthSession, setNoAuthSession] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    const { auth } = await import("../services/firebaseInit");
    if (!auth.currentUser) {
      setNoAuthSession(true);
      setLoading(false);
      return;
    }
    setNoAuthSession(false);
    setLoading(true);
    try {
      const [f, r, fl, fg] = await Promise.all([
        fetchFriends(user.uid),
        fetchFriendRequests(user.uid),
        fetchFollowers(user.uid),
        fetchFollowing(user.uid),
      ]);
      setFriends(f);
      setRequests(r);
      setFollowers(fl);
      setFollowing(fg);
    } catch (e) {
      console.error("MIMI // Failed to load connections data", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setSearching(true);
        try {
          const results = await searchUsers(searchTerm);
          setSearchResults(results.filter((r) => r.uid !== user?.uid));
        } catch (e) {
          console.error("MIMI // Search failed", e);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user]);

  if (!user || user.isAnonymous) {
    return (
      <div className="py-16 text-center space-y-6">
        <p className="font-serif italic text-2xl text-[var(--mimi-ink,#0a0a0a)]">
          Anchor your identity to open the circle.
        </p>
        <PublicCTA
          onClick={() =>
            window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "profile" }))
          }
        >
          Anchor Identity
        </PublicCTA>
      </div>
    );
  }

  if (noAuthSession) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="font-serif italic text-xl text-[var(--mimi-ink,#0a0a0a)]">
          Session not ready.
        </p>
        <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
          Sign in again to load correspondents.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "friends" as const, label: "Connected", count: friends.length, icon: <Users size={12} /> },
    {
      id: "requests" as const,
      label: "Requests",
      count: requests.length,
      icon: <UserPlus size={12} />,
      highlight: requests.length > 0,
    },
    {
      id: "followers" as const,
      label: "Resonants",
      count: followers.length,
      icon: <Heart size={12} />,
    },
    {
      id: "following" as const,
      label: "Resonating",
      count: following.length,
      icon: <ArrowRight size={12} />,
    },
    { id: "search" as const, label: "Find", count: 0, icon: <Search size={12} /> },
  ];

  const body = (
    <div className="space-y-8">
      {!embedded && (
        <header className="space-y-3 pb-8 border-b border-[var(--mimi-hairline,#d4d4d4)]">
          <p className="font-sans text-[9px] uppercase tracking-[0.35em] text-[var(--mimi-olive,#5A5A40)] font-semibold">
            Correspondents
          </p>
          <h2 className="font-serif italic text-4xl md:text-5xl tracking-tighter text-[var(--mimi-ink,#0a0a0a)] leading-none">
            Connections.
          </h2>
          <p className="font-serif italic text-base text-[var(--mimi-stone,#78716c)] max-w-lg">
            Soft follows, mutual consonants, and people worth inviting into a clique.
          </p>
        </header>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--mimi-hairline,#d4d4d4)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-3 flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.22em] font-semibold transition-colors ${
              activeTab === tab.id
                ? "text-[var(--mimi-ink,#0a0a0a)]"
                : "text-[var(--mimi-stone,#78716c)] hover:text-[var(--mimi-ink,#0a0a0a)]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="font-mono text-[9px] tabular-nums opacity-60">{tab.count}</span>
            )}
            {tab.highlight && (
              <span
                aria-hidden
                className="absolute top-0 -right-1 w-1.5 h-1.5 bg-[var(--mimi-cobalt,#9BB8CE)]"
              />
            )}
            {activeTab === tab.id && (
              <motion.span
                layoutId="conn-tab-rule"
                className="absolute left-0 right-0 -bottom-px h-px bg-[var(--mimi-ink,#0a0a0a)]"
              />
            )}
          </button>
        ))}
      </div>

      <div className={`relative ${embedded ? "min-h-0" : "min-h-[280px]"}`}>
        {loading ? (
          <div
            className={`${
              embedded ? "py-8 flex items-center justify-center" : "absolute inset-0 flex items-center justify-center"
            }`}
          >
            <Loader2 size={22} className="animate-spin text-[var(--mimi-stone,#78716c)]" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              {activeTab === "friends" &&
                (friends.length > 0 ? (
                  friends.map((f) => (
                    <ConnectionItem
                      key={f.id}
                      userId={f.friendId}
                      type="friend"
                      onActionComplete={loadData}
                    />
                  ))
                ) : (
                  <EmptyState compact={embedded} message="No connections established yet." />
                ))}
              {activeTab === "requests" &&
                (requests.length > 0 ? (
                  requests.map((r) => (
                    <ConnectionItem
                      key={r.id}
                      userId={r.senderId}
                      type="request"
                      requestId={r.id}
                      onActionComplete={loadData}
                    />
                  ))
                ) : (
                  <EmptyState compact={embedded} message="No pending connection requests." />
                ))}
              {activeTab === "followers" &&
                (followers.length > 0 ? (
                  followers.map((f) => (
                    <ConnectionItem
                      key={f.id}
                      userId={f.followerId}
                      type="follower"
                      onActionComplete={loadData}
                    />
                  ))
                ) : (
                  <EmptyState compact={embedded} message="No resonants yet." />
                ))}
              {activeTab === "following" &&
                (following.length > 0 ? (
                  following.map((f) => (
                    <ConnectionItem
                      key={f.id}
                      userId={f.followingId}
                      type="following"
                      onActionComplete={loadData}
                    />
                  ))
                ) : (
                  <EmptyState compact={embedded} message="You haven't resonated with anyone yet." />
                ))}
              {activeTab === "search" && (
                <div className="space-y-6">
                  <div className="relative max-w-md">
                    <Search
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--mimi-stone,#78716c)]"
                      size={16}
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by handle…"
                      className="w-full pl-8 pr-2 py-3 bg-transparent border-b border-[var(--mimi-hairline,#d4d4d4)] focus:outline-none focus:border-[var(--mimi-ink,#0a0a0a)] font-serif italic text-[var(--mimi-ink,#0a0a0a)] placeholder:text-[var(--mimi-stone,#78716c)]/60"
                    />
                  </div>
                  {searching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={22} className="animate-spin text-[var(--mimi-stone,#78716c)]" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((r) => (
                      <ConnectionItem
                        key={r.uid}
                        userId={r.uid}
                        type="search"
                        onActionComplete={loadData}
                      />
                    ))
                  ) : searchTerm.length >= 2 ? (
                    <EmptyState compact={embedded} message="No users found matching that handle." />
                  ) : (
                    <p className="py-10 font-serif italic text-[var(--mimi-stone,#78716c)] text-sm">
                      Enter at least two characters to search the registry.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar bg-[var(--mimi-field,#ffffff)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-32">{body}</div>
      <ColumnRule className="opacity-0" />
    </div>
  );
};

const EmptyState: React.FC<{ message: string; compact?: boolean }> = ({
  message,
  compact,
}) => (
  <div
    className={`${
      compact ? "py-6" : "py-16"
    } flex flex-col items-center justify-center text-center space-y-3`}
  >
    <Users
      size={compact ? 22 : 32}
      className="text-[var(--mimi-stone,#78716c)] opacity-50"
    />
    <p className="font-serif italic text-sm text-[var(--mimi-stone,#78716c)]">{message}</p>
  </div>
);
