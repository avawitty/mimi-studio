import React, { useEffect, useState } from 'react';
import type { Doll, TailorProject } from '../../types';
import { listDolls, listTailorProjects, listFieldNotes } from '../../services/tailorService';
import { DollProfileScreen } from './DollProfileScreen';
import { DollGalleryCard } from "./DollGalleryCard";
import { FieldNotesScreen } from './FieldNotesScreen';
import { ArtHistoryMirrorScreen } from './ArtHistoryMirrorScreen';

interface MimiYouHubProps {
  userId: string;
  handle: string;
  navigate: (path: string) => void;
}

type Tab = 'overview' | 'dolls' | 'field-notes' | 'art-history';

export const MimiYouHub: React.FC<MimiYouHubProps> = ({ userId, handle, navigate }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [projects, setProjects] = useState<TailorProject[]>([]);
  const [selectedDoll, setSelectedDoll] = useState<Doll | null>(null);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    void Promise.all([
      listDolls(userId),
      listTailorProjects(userId),
      listFieldNotes(userId),
    ]).then(([d, p, n]) => {
      setDolls(d);
      setProjects(p);
      setNoteCount(n.length);
    });
  }, [userId]);

  if (selectedDoll) {
    return (
      <DollProfileScreen
        doll={selectedDoll}
        onBack={() => setSelectedDoll(null)}
        onContinue={() => setSelectedDoll(null)}
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Universe' },
    { id: 'dolls', label: 'Dolls' },
    { id: 'field-notes', label: 'Field Notes' },
    { id: 'art-history', label: 'Art History' },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#FDFBF7] dark:bg-[#0A0A0A]">
      <header className="border-b border-nous-border/20 px-6 py-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-nous-subtle mb-2">mimi.you</p>
        <h1 className="font-serif text-4xl text-nous-text mb-2">@{handle}</h1>
        <p className="text-sm text-nous-subtle max-w-lg">
          Your creative universe — a projection from evidence, not an identity.
        </p>
      </header>

      <nav className="flex gap-1 px-6 border-b border-nous-border/20 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[10px] uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px ${
              tab === t.id ? 'border-nous-text text-nous-text' : 'border-transparent text-nous-subtle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="border border-nous-border/30 p-5 text-center">
              <p className="text-2xl font-serif text-nous-text">{projects.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle mt-1">Tailor Projects</p>
            </div>
            <div className="border border-nous-border/30 p-5 text-center">
              <p className="text-2xl font-serif text-nous-text">{dolls.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle mt-1">Dolls</p>
            </div>
            <div className="border border-nous-border/30 p-5 text-center">
              <p className="text-2xl font-serif text-nous-text">{noteCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-nous-subtle mt-1">Field Notes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tailor')}
            className="w-full py-3 bg-nous-text text-[#FDFBF7] text-xs uppercase tracking-[0.2em]"
          >
            Open Tailor
          </button>
        </div>
      )}

      {tab === 'dolls' && (
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid gap-6 md:grid-cols-2">
            {dolls.map((doll) => (
              <DollGalleryCard
                key={doll.id}
                doll={doll}
                onOpen={() => setSelectedDoll(doll)}
                onPublicCard={() => navigate(`/u/${handle}`)}
              />
            ))}
            {dolls.length === 0 && (
              <div className="border border-dashed border-nous-border/40 p-8 text-center space-y-4">
                <p className="text-sm text-nous-subtle italic">No dolls yet.</p>
                <p className="text-xs text-nous-subtle max-w-sm mx-auto">
                  Create one in Tailor: evidence intake → patterns → laws → outputs →
                  <strong className="font-normal text-nous-text"> Generate Doll</strong>.
                  Needs your Gemini key in Profile → Keychain.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/tailor')}
                  className="text-[10px] uppercase tracking-[0.2em] px-5 py-2 border border-nous-border/50 hover:border-nous-text/40"
                >
                  Start Tailor intake →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'field-notes' && <FieldNotesScreen userId={userId} />}
      {tab === 'art-history' && (
        <ArtHistoryMirrorScreen userId={userId} onBack={() => setTab('overview')} />
      )}
    </div>
  );
};
