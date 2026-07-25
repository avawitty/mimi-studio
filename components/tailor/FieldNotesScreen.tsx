import React, { useEffect, useState } from 'react';
import type { FieldNote } from '../../types';
import { listFieldNotes, createFieldNote } from '../../services/tailorService';

interface FieldNotesScreenProps {
  userId: string;
  projectId?: string;
}

const NOTE_TYPE_LABELS: Record<FieldNote['noteType'], string> = {
  observation: 'Observation',
  question: 'Question',
  correction: 'Correction',
  experiment: 'Experiment',
  source: 'Source',
  reflection: 'Reflection',
  art_history: 'Art History',
  project_note: 'Project Note',
};

export const FieldNotesScreen: React.FC<FieldNotesScreenProps> = ({ userId, projectId }) => {
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [filter, setFilter] = useState<FieldNote['noteType'] | 'all'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = () => {
    void listFieldNotes(userId, projectId).then(setNotes);
  };

  useEffect(() => {
    load();
  }, [userId, projectId]);

  const filtered = filter === 'all' ? notes : notes.filter((n) => n.noteType === filter);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    await createFieldNote(userId, {
      projectId,
      title,
      body,
      noteType: 'reflection',
      linkedEvidenceNodeIds: [],
      linkedPatternClusterIds: [],
      linkedCreativeLawIds: [],
      linkedDollIds: [],
      tags: [],
    });
    setTitle('');
    setBody('');
    load();
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-nous-subtle mb-2">Field Notes</p>
      <h1 className="font-serif text-2xl text-nous-text mb-2">Research notebook</h1>
      <p className="text-sm text-nous-subtle mb-8">
        Living memory. Nothing deleted. Everything searchable.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`text-[10px] uppercase tracking-wider px-3 py-1 border ${filter === 'all' ? 'bg-nous-text text-[#FDFBF7]' : 'border-nous-border/40'}`}
        >
          All
        </button>
        {(Object.keys(NOTE_TYPE_LABELS) as FieldNote['noteType'][]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 border ${filter === t ? 'bg-nous-text text-[#FDFBF7]' : 'border-nous-border/40'}`}
          >
            {NOTE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="border border-nous-border/40 p-4 mb-8">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full mb-2 bg-transparent border-b border-nous-border/30 pb-2 text-sm focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Your observation, question, or experiment…"
          rows={3}
          className="w-full bg-transparent text-sm resize-none focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="mt-3 text-xs uppercase tracking-widest px-4 py-2 border border-nous-border/40 hover:border-nous-text/40"
        >
          Add note
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((note) => (
          <article key={note.id} className="border border-nous-border/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] uppercase tracking-wider text-nous-subtle">
                {NOTE_TYPE_LABELS[note.noteType]}
              </span>
              <span className="text-[9px] text-nous-subtle">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-sm font-medium text-nous-text mb-1">{note.title}</h3>
            <p className="text-sm text-nous-subtle whitespace-pre-wrap">{note.body}</p>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-nous-subtle italic">No field notes yet.</p>
        )}
      </div>
    </div>
  );
};
