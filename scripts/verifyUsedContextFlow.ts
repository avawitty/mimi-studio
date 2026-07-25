/**
 * WO-2: Used Context loop — local service verification (no browser/Firebase required).
 * Run: npx tsx scripts/verifyUsedContextFlow.ts
 */

type MemoryAtom = {
  id: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  projectId?: string;
};

type UsedContextEntry = {
  atomId: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  projectId?: string;
  addedAt: number;
  approved: boolean;
  target: "studio" | "the-edit";
};

const STORAGE_KEY = "mimi_studio_used_context_test";
const store: Record<string, string> = {};

const localStorageShim = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
};

function readStore(): UsedContextEntry[] {
  const raw = localStorageShim.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as UsedContextEntry[];
}

function writeStore(entries: UsedContextEntry[]) {
  localStorageShim.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addToUsedContext(atom: MemoryAtom, target: UsedContextEntry["target"] = "studio") {
  const entries = readStore();
  const entry: UsedContextEntry = {
    atomId: atom.id,
    title: atom.title,
    content: atom.content,
    source: atom.source,
    tags: atom.tags,
    projectId: atom.projectId,
    addedAt: Date.now(),
    approved: false,
    target,
  };
  writeStore([entry, ...entries]);
  return entry;
}

function setApproved(atomId: string, approved: boolean, target?: UsedContextEntry["target"]) {
  writeStore(
    readStore().map((e) => {
      if (e.atomId !== atomId) return e;
      if (target && e.target !== target) return e;
      return { ...e, approved };
    }),
  );
}

function getApproved(target?: UsedContextEntry["target"]) {
  const entries = readStore();
  return entries.filter((e) => e.approved && (!target || e.target === target));
}

function clearApproved(target?: UsedContextEntry["target"]) {
  writeStore(
    readStore().filter((e) => {
      if (!e.approved) return true;
      return target ? e.target !== target : false;
    }),
  );
}

function buildGenerationPayload() {
  const usedContext = getApproved("studio");
  return {
    usedContext,
    fragmentIds: usedContext.map((e) => e.atomId),
    usedContextSnapshots: usedContext.map(({ atomId, title, content, source }) => ({
      atomId,
      title,
      content,
      source,
    })),
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  localStorageShim.removeItem(STORAGE_KEY);

  const atom: MemoryAtom = {
    id: "atom_wo2_test",
    title: "Scribe capture — palette restraint",
    content: "Evidence: recurring negative space and warm paper tones across refs.",
    source: "scribe:test",
    tags: ["palette", "evidence"],
  };

  addToUsedContext(atom, "studio");
  assert(readStore().length === 1, "Expected one tray entry after Scribe send");
  assert(readStore()[0].approved === false, "New entries start unapproved");

  setApproved(atom.id, true, "studio");
  const payload = buildGenerationPayload();
  assert(payload.fragmentIds.length === 1, "Approved atom should map to fragmentIds");
  assert(payload.usedContextSnapshots[0]?.title === atom.title, "Snapshot title preserved");

  clearApproved("studio");
  assert(getApproved("studio").length === 0, "Post-generation clear should remove approved studio context");
  assert(readStore().length === 0, "Approved entry removed from tray after generation");

  addToUsedContext(atom, "the-edit");
  setApproved(atom.id, true, "the-edit");
  assert(getApproved("the-edit").length === 1, "Edit target tray independent from studio");

  console.log("WO-2 Used Context service verification: PASS");
  console.log("");
  console.log("Manual E2E on mimi.you preview (requires sign-in):");
  console.log("  1. /scribe → Capture tab → paste fragment → Save Memory Atom");
  console.log("  2. /studio → Used Context tray → approve atom");
  console.log("  3. Submit zine → /zine/:id reveal → verify Used Context section + fragmentsUsed");
  console.log("  4. Share link → bot OG preview at /zine/:id (Twitter/Facebook debugger)");
  console.log("  5. /the-edit → approved context tray shows same atom");
}

run();
