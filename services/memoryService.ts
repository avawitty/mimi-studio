import { db } from './firebaseInit';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { MemoryAtom, ScribeSignalType } from '../types';
import { withResilience } from './geminiClient';

const MEMORY_ATOM_KIND = 'memory_atom' as const;

function isMemoryAtomDoc(data: Record<string, unknown>): boolean {
  if (data.kind === MEMORY_ATOM_KIND) return true;
  if (data.kind === 'embedding_shadow') return false;
  return typeof data.content === 'string' && !Array.isArray(data.embedding_field);
}

function normalizeScribeSource(signalType: ScribeSignalType): string {
  switch (signalType) {
    case 'dialogue_paste':
      return 'Scribe Capture';
    case 'conversation_log':
      return 'AI Conversation Log';
    case 'link_drop':
      return 'Link Drop';
    case 'highlight_selection':
      return 'Highlighted Selection';
    case 'ask_answer':
      return 'Scribe Ask';
    case 'selection_capture':
      return 'Selection Capture';
    case 'manual':
      return 'Scribe';
    default: {
      const _exhaustive: never = signalType;
      return _exhaustive;
    }
  }
}

function defaultTagsForSignal(signalType: ScribeSignalType): string[] {
  switch (signalType) {
    case 'dialogue_paste':
      return ['scribe', 'capture', 'dialogue'];
    case 'conversation_log':
      return ['scribe', 'capture', 'conversation'];
    case 'link_drop':
      return ['scribe', 'capture', 'link'];
    case 'highlight_selection':
      return ['scribe', 'capture', 'highlight'];
    case 'ask_answer':
      return ['scribe', 'ask'];
    case 'selection_capture':
      return ['scribe', 'captured', 'selection'];
    case 'manual':
      return ['scribe'];
    default: {
      const _exhaustive: never = signalType;
      return _exhaustive;
    }
  }
}

export interface ScribeSignalInput {
  content: string;
  signalType: ScribeSignalType;
  projectId?: string;
  title?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Parse lightweight metadata from raw Scribe conversation signals. */
export function parseScribeSignals(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const urlMatches = trimmed.match(/https?:\/\/[^\s)]+/g) ?? [];
  const questionLines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.endsWith('?'));
  const speakerMatches = trimmed.match(/^(?:User|Assistant|Human|AI|Mimi):/gim) ?? [];

  return {
    charCount: trimmed.length,
    wordCount: trimmed.split(/\s+/).filter(Boolean).length,
    urls: urlMatches.slice(0, 8),
    questionCount: questionLines.length,
    hasDialogueStructure: speakerMatches.length > 0,
    capturedAt: Date.now(),
  };
}

export function createAtomFromScribeSignal(input: ScribeSignalInput): MemoryAtom {
  const metadata = {
    ...parseScribeSignals(input.content),
    ...(input.metadata ?? {}),
  };

  return {
    id: `atom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId ?? 'Default Project',
    content: input.content.trim(),
    title: input.title,
    timestamp: Date.now(),
    source: input.source ?? normalizeScribeSource(input.signalType),
    tags: input.tags ?? defaultTagsForSignal(input.signalType),
    kind: MEMORY_ATOM_KIND,
    signalType: input.signalType,
    metadata,
  };
}

/**
 * Fetches memory atoms for a user from Firestore (excludes embedding shadow docs).
 */
export const fetchMemoryAtoms = async (userId: string): Promise<MemoryAtom[]> => {
  try {
    const memoryRef = collection(db, 'users', userId, 'memory');
    const q = query(
      memoryRef,
      where('kind', '==', MEMORY_ATOM_KIND),
      orderBy('timestamp', 'desc'),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      const fallbackSnap = await getDocs(
        query(memoryRef, orderBy('timestamp', 'desc')),
      );
      return fallbackSnap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter(isMemoryAtomDoc)
        .map((d) => d as unknown as MemoryAtom);
    }

    return snap.docs.map((d) => d.data() as MemoryAtom);
  } catch (error) {
    console.error("MIMI // fetchMemoryAtoms failed:", error);
    try {
      const memoryRef = collection(db, 'users', userId, 'memory');
      const snap = await getDocs(query(memoryRef, orderBy('timestamp', 'desc')));
      return snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter(isMemoryAtomDoc)
        .map((d) => d as unknown as MemoryAtom);
    } catch {
      return [];
    }
  }
};

export const fetchMemoryAtomsByTag = async (
  userId: string,
  tag: string,
): Promise<MemoryAtom[]> => {
  const atoms = await fetchMemoryAtoms(userId);
  return atoms.filter((a) => a.tags?.includes(tag));
};

/**
 * Saves or updates a memory atom in Firestore.
 */
export const saveMemoryAtom = async (userId: string, atom: MemoryAtom): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId, 'memory', atom.id);
    const payload: MemoryAtom = {
      ...atom,
      kind: MEMORY_ATOM_KIND,
    };
    await setDoc(docRef, payload, { merge: true });

    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Memory Atom Synced to Project Container.", type: 'success' }
    }));
  } catch (error) {
    console.error("MIMI // saveMemoryAtom failed:", error);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Failed to save memory atom.", type: 'error' }
    }));
    throw error;
  }
};

/**
 * Deletes a memory atom from Firestore.
 */
export const deleteMemoryAtom = async (userId: string, atomId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId, 'memory', atomId);
    await deleteDoc(docRef);

    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Memory Atom Purged from Archive.", type: 'success' }
    }));
  } catch (error) {
    console.error("MIMI // deleteMemoryAtom failed:", error);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: "Failed to delete memory atom.", type: 'error' }
    }));
    throw error;
  }
};

export const suggestTitleForAtom = async (content: string): Promise<string> => {
  try {
    return await withResilience(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are a minimalist editor. Analyze the following research or answer snippet and generate an elegant, extremely concise, conceptual 2-5 word title/concept for it. Return ONLY the title text, with no formatting, markdown, quotes, or trailing punctuation. Keep it extremely sharp and sophisticated.

Content:
"${content}"`
      });
      const result = response.text?.trim() || "";
      return result.replace(/^["'“”‘']/ , '').replace(/["'“”‘']$/, '').replace(/\.$/, '');
    });
  } catch (error) {
    console.warn("MIMI // suggestTitleForAtom LLM call failed, fallback used:", error);
    const words = content.trim().split(/\s+/).slice(0, 4).join(' ');
    return words ? words + '...' : "Conceptual Fragment";
  }
};

export const mirrorAtomToPocket = async (
  userId: string,
  atom: MemoryAtom,
): Promise<void> => {
  try {
    const { archiveManager } = await import("./archiveManager");
    await archiveManager.saveToPocket(userId, "text", {
      title: atom.title || "Memory Atom",
      text: atom.content,
      atomId: atom.id,
      source: atom.source,
      provenance: "scribe-memory-atom",
      signalType: atom.signalType,
    });
  } catch (error) {
    console.warn("MIMI // mirrorAtomToPocket failed:", error);
  }
};

export const askScribeMemory = async (
  userId: string,
  query: string,
): Promise<string> => {
  const atoms = await fetchMemoryAtoms(userId);
  const contextBlock =
    atoms.length > 0
      ? atoms
          .slice(0, 12)
          .map(
            (a) =>
              `- [${a.title || "Untitled"}] (${a.source || "Scribe"}): ${a.content.slice(0, 400)}`,
          )
          .join("\n")
      : "(No memory atoms saved yet.)";

  return await withResilience(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are Mimi Scribe — the semantic memory portal for taste and editorial intelligence.

SAVED MEMORY ATOMS:
${contextBlock}

USER QUESTION:
"${query}"

Answer in 2–4 concise paragraphs. Reference specific atoms when relevant. Editorial, sharp, high-fashion tone. If atoms are empty, answer from general aesthetic intelligence and suggest what to capture next.`,
    });
    return response.text?.trim() || "The Scribe could not generate an answer. Try again.";
  });
};

export const saveAskAnswerAsAtom = async (
  userId: string,
  query: string,
  answer: string,
  projectId = "Default Project",
  mirrorToPocket = true,
): Promise<MemoryAtom> => {
  const content = `Q: ${query.trim()}\n\nA: ${answer.trim()}`;
  const title = await suggestTitleForAtom(content);
  const atom = createAtomFromScribeSignal({
    content,
    signalType: 'ask_answer',
    projectId,
    title,
    tags: ['ask', 'scribe'],
  });
  await saveMemoryAtom(userId, atom);
  if (mirrorToPocket) {
    await mirrorAtomToPocket(userId, atom);
  }
  return atom;
};

/* ------------------------------------------------------------------ *
 * Ghost-session signature persistence (localStorage-backed)
 * Lets unsigned readers keep confirmed "Signature Takeaways" locally,
 * then migrate them into their profile the moment they sign on.
 * ------------------------------------------------------------------ */

const LOCAL_SIGNATURE_KEY = 'mimi_local_signatures';

/** Reads locally-stored signature atoms saved during a ghost session. */
export function fetchLocalSignatureAtoms(): MemoryAtom[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SIGNATURE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryAtom[]) : [];
  } catch (error) {
    console.warn('MIMI // fetchLocalSignatureAtoms failed:', error);
    return [];
  }
}

/** Saves a signature atom to localStorage (deduped by id). */
export function saveLocalSignatureAtom(atom: MemoryAtom): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = fetchLocalSignatureAtoms().filter((a) => a.id !== atom.id);
    const next = [...existing, { ...atom, kind: MEMORY_ATOM_KIND }];
    localStorage.setItem(LOCAL_SIGNATURE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: 'Signature kept locally — sign on to sync it.', type: 'success' },
    }));
  } catch (error) {
    console.warn('MIMI // saveLocalSignatureAtom failed:', error);
  }
}

/** Removes a locally-stored signature atom by id. */
export function removeLocalSignatureAtom(atomId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const next = fetchLocalSignatureAtoms().filter((a) => a.id !== atomId);
    localStorage.setItem(LOCAL_SIGNATURE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('MIMI // removeLocalSignatureAtom failed:', error);
  }
}

/**
 * Migrates any ghost-session signatures into the signed-in user's profile.
 * Safe to call on every sign-on; clears the local cache once synced.
 */
export async function migrateLocalSignaturesToProfile(userId: string): Promise<number> {
  const local = fetchLocalSignatureAtoms();
  if (local.length === 0) return 0;
  let migrated = 0;
  for (const atom of local) {
    try {
      await saveMemoryAtom(userId, atom);
      migrated += 1;
    } catch (error) {
      console.warn('MIMI // migrateLocalSignaturesToProfile atom failed:', error);
    }
  }
  if (migrated > 0 && typeof localStorage !== 'undefined') {
    localStorage.removeItem(LOCAL_SIGNATURE_KEY);
    window.dispatchEvent(new CustomEvent('mimi:registry_alert', {
      detail: { message: `${migrated} signature${migrated === 1 ? '' : 's'} synced to your profile.`, type: 'success' },
    }));
  }
  return migrated;
}

/** Grounding block for Studio generation — aligns with usedContextService. */
export function memoryAtomsToContextBlock(atoms: MemoryAtom[]): string {
  if (atoms.length === 0) return '';
  return atoms
    .map(
      (a) =>
        `- [${a.title || 'Untitled'}] (${a.source || 'Scribe'}${a.tags?.length ? ` · ${a.tags.join(', ')}` : ''}): ${a.content.slice(0, 500)}`,
    )
    .join('\n');
}
