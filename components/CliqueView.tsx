
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import { Users, UserPlus, Trash2, Plus, X, Loader2, ChevronRight, Lock, Check, UserMinus, Layers } from 'lucide-react';
import { Clique, createClique, deleteClique, subscribeToCliques, addMemberToClique, removeMemberFromClique } from '../services/cliques';
import { fetchFriends, Friendship } from '../services/connections';
import { getUserProfile } from '../services/firebaseUtils';
import { UserProfile } from '../types';

// ─── Member Item ────────────────────────────────────────────────────────────

const MemberItem: React.FC<{
  userId: string;
  isOwner: boolean;
  isSelf: boolean;
  onRemove?: () => void;
}> = ({ userId, isOwner, isSelf, onRemove }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(userId).then(setProfile).catch(() => {});
  }, [userId]);

  if (!profile) return <div className="h-12 animate-pulse bg-nous-base/50 rounded-none" />;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-nous-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-none overflow-hidden border border-nous-border bg-nous-base shrink-0">
          <img
            src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.handle || 'U'}&background=1c1917&color=fff`}
            className="w-full h-full object-cover grayscale"
            alt=""
          />
        </div>
        <span className="font-serif italic text-sm text-nous-text">@{profile.handle}</span>
        {isOwner && (
          <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black border border-nous-border px-1.5 py-0.5">Owner</span>
        )}
      </div>
      {!isSelf && onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-nous-subtle hover:text-red-500 transition-colors"
          title="Remove from clique"
        >
          <UserMinus size={14} />
        </button>
      )}
    </div>
  );
};

// ─── Clique Detail Panel ─────────────────────────────────────────────────────

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

  const nonMemberFriends = friends.filter(f => !clique.memberIds.includes(f.friendId));

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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-nous-subtle hover:text-nous-text transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div>
          <h3 className="font-serif italic text-2xl text-nous-text">{clique.name}</h3>
          {clique.description && <p className="font-sans text-[9px] uppercase tracking-widest text-nous-subtle font-black">{clique.description}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setAdding(!adding)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-none font-sans text-[8px] uppercase tracking-widest font-black transition-all ${adding ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-nous-base text-nous-subtle border-nous-border hover:border-nous-border'}`}
          >
            <UserPlus size={12} /> Add Members
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-nous-subtle hover:text-red-500 transition-colors"
            title="Delete clique"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {/* Add members panel */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="border border-nous-border rounded-none p-4 space-y-2 bg-nous-base">
              <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black mb-3">Your Connected Friends</p>
              {nonMemberFriends.length === 0 ? (
                <p className="font-serif italic text-sm text-nous-subtle opacity-60">
                  {friends.length === 0 ? 'Connect with people first to add them to cliques.' : 'All your connections are already in this clique.'}
                </p>
              ) : (
                nonMemberFriends.map(f => (
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

      {/* Member list */}
      <div className="border border-nous-border rounded-none divide-y divide-nous-border">
        <div className="px-4 py-3 border-b border-nous-border bg-nous-base">
          <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">{clique.memberIds.length} Member{clique.memberIds.length !== 1 ? 's' : ''}</span>
        </div>
        {clique.memberIds.map(mid => (
          <MemberItem
            key={mid}
            userId={mid}
            isOwner={mid === clique.ownerId}
            isSelf={mid === user?.uid}
            onRemove={mid !== clique.ownerId ? () => handleRemove(mid) : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
};

// ─── Friend Add Item ─────────────────────────────────────────────────────────

const FriendAddItem: React.FC<{ userId: string; loading: boolean; onAdd: () => void }> = ({ userId, loading, onAdd }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile(userId).then(setProfile).catch(() => {});
  }, [userId]);

  if (!profile) return <div className="h-10 animate-pulse bg-nous-base/50 rounded-none" />;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-none overflow-hidden border border-nous-border bg-nous-base shrink-0">
          <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.handle || 'U'}&background=1c1917&color=fff`} className="w-full h-full object-cover grayscale" alt="" />
        </div>
        <span className="font-serif italic text-sm text-nous-text">@{profile.handle}</span>
      </div>
      <button
        onClick={onAdd}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-nous-text text-nous-base rounded-none font-sans text-[7px] uppercase tracking-widest font-black hover:opacity-80 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
        Add
      </button>
    </div>
  );
};

// ─── CliqueView (Main) ───────────────────────────────────────────────────────

export const CliqueView: React.FC = () => {
  const { user } = useUser();
  const [cliques, setCliques] = useState<Clique[]>([]);
  const [friends, setFriends] = useState<(Friendship & { friendId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClique, setSelectedClique] = useState<Clique | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Subscribe to cliques in real-time
  useEffect(() => {
    if (!user?.uid || user.isAnonymous) { setLoading(false); return; }
    const unsub = subscribeToCliques(user.uid, (data) => {
      setCliques(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, user?.isAnonymous]);

  // Load friends for "add member" flow
  useEffect(() => {
    if (!user?.uid || user.isAnonymous) return;
    fetchFriends(user.uid).then(setFriends).catch(() => {});
  }, [user?.uid, user?.isAnonymous]);

  // Keep selectedClique in sync with live data
  useEffect(() => {
    if (selectedClique) {
      const updated = cliques.find(c => c.id === selectedClique.id);
      if (updated) setSelectedClique(updated);
      else setSelectedClique(null); // deleted
    }
  }, [cliques]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const clique = await createClique(newName, newDesc);
      if (clique) {
        setCreating(false);
        setNewName('');
        setNewDesc('');
      }
    } catch (e) {
      console.error("MIMI // createClique failed", e);
    } finally {
      setCreateLoading(false);
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-32 text-center space-y-10 bg-nous-base">
        <Lock size={48} className="text-nous-text" />
        <div className="space-y-4">
          <h3 className="font-serif text-4xl italic tracking-tighter text-nous-text">Identity Required.</h3>
          <p className="font-serif italic text-xl text-nous-subtle max-w-sm">Anchor your identity to create and manage cliques.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }))}
          className="px-10 py-5 bg-nous-text text-nous-base rounded-none font-sans text-[10px] uppercase tracking-widest font-black"
        >
          Anchor Identity
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-nous-base">
        <Loader2 size={32} className="animate-spin text-nous-subtle" />
        <span className="font-sans text-[8px] uppercase tracking-[0.6em] text-nous-subtle font-black">Loading Cliques...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar bg-nous-base pb-32">
      <div className="w-full max-w-3xl mx-auto px-6 md:px-12 pt-12 md:pt-20 space-y-12">

        {/* Header */}
        <div className="flex flex-col border-b border-nous-border pb-10 gap-6">
          <div className="flex items-center gap-3 text-nous-subtle">
            <Layers size={14} className="animate-pulse" />
            <span className="font-sans text-[10px] uppercase tracking-[0.5em] font-black">Social Architecture</span>
          </div>
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="font-serif text-5xl md:text-7xl italic tracking-tighter text-nous-text leading-none">Cliques.</h2>
              <p className="font-serif italic text-base text-nous-subtle max-w-xs">
                Curate your inner circles. Group your connections by frequency, resonance, or ritual.
              </p>
            </div>
            <button
              onClick={() => setCreating(!creating)}
              className={`flex items-center gap-2 px-6 py-3 border rounded-none font-sans text-[8px] uppercase tracking-widest font-black shrink-0 transition-all ${creating ? 'bg-nous-text text-nous-base border-nous-text' : 'bg-nous-base text-nous-text border-nous-border hover:border-nous-text'}`}
            >
              {creating ? <X size={14} /> : <Plus size={14} />}
              {creating ? 'Cancel' : 'New Clique'}
            </button>
          </div>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border border-nous-border rounded-none p-6 space-y-4 bg-nous-base">
                <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">New Clique</p>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Clique name..."
                  maxLength={60}
                  className="w-full px-4 py-3 bg-transparent border border-nous-border rounded-none font-serif italic text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:ring-1 focus:ring-nous-text transition-all"
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)..."
                  maxLength={120}
                  className="w-full px-4 py-3 bg-transparent border border-nous-border rounded-none font-serif italic text-sm text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:ring-1 focus:ring-nous-text transition-all"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-nous-text text-nous-base rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:opacity-80 disabled:opacity-40 transition-all"
                >
                  {createLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Create Clique
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clique list or detail */}
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
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {cliques.length === 0 ? (
                <div className="py-24 text-center opacity-40 space-y-6">
                  <Users size={48} className="mx-auto text-nous-subtle" />
                  <p className="font-serif italic text-xl text-nous-subtle">No cliques yet. Create your first one.</p>
                </div>
              ) : (
                cliques.map(clique => (
                  <button
                    key={clique.id}
                    onClick={() => setSelectedClique(clique)}
                    className="w-full flex items-center justify-between p-5 border border-nous-border rounded-none text-left hover:border-nous-text transition-all group bg-nous-base"
                  >
                    <div className="space-y-1">
                      <h4 className="font-serif italic text-lg text-nous-text group-hover:text-nous-text">{clique.name}</h4>
                      {clique.description && (
                        <p className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">{clique.description}</p>
                      )}
                      <p className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle/60">
                        {clique.memberIds.length} member{clique.memberIds.length !== 1 ? 's' : ''} · Created {new Date(clique.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-nous-subtle group-hover:text-nous-text transition-colors shrink-0" />
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
