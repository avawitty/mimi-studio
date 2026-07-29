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
  ownerUid?: string;
  addedAt: number;
  approved: boolean;
  target: "studio" | "the-edit";
};

const STORAGE_KEY = "mimi_studio_used_context_test";
const COMPILE_KEY = "mimi_edit_compile_export_test";
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

function keyFor(ownerUid: string) {
  return `${STORAGE_KEY}::${ownerUid}`;
}

function compileKeyFor(ownerUid: string) {
  return `${COMPILE_KEY}::${ownerUid}`;
}

function readStore(ownerUid: string): UsedContextEntry[] {
  const raw = localStorageShim.getItem(keyFor(ownerUid));
  if (!raw) return [];
  return JSON.parse(raw) as UsedContextEntry[];
}

function writeStore(ownerUid: string, entries: UsedContextEntry[]) {
  localStorageShim.setItem(keyFor(ownerUid), JSON.stringify(entries));
}

function addToUsedContext(
  ownerUid: string,
  atom: MemoryAtom,
  target: UsedContextEntry["target"] = "studio",
) {
  const entries = readStore(ownerUid);
  const entry: UsedContextEntry = {
    atomId: atom.id,
    title: atom.title,
    content: atom.content,
    source: atom.source,
    tags: atom.tags,
    projectId: atom.projectId,
    ownerUid,
    addedAt: Date.now(),
    approved: false,
    target,
  };
  writeStore(ownerUid, [entry, ...entries]);
  return entry;
}

function setApproved(
  ownerUid: string,
  atomId: string,
  approved: boolean,
  target?: UsedContextEntry["target"],
) {
  writeStore(
    ownerUid,
    readStore(ownerUid).map((e) => {
      if (e.atomId !== atomId) return e;
      if (target && e.target !== target) return e;
      return { ...e, approved };
    }),
  );
}

function getApproved(ownerUid: string, target?: UsedContextEntry["target"]) {
  const entries = readStore(ownerUid);
  return entries.filter((e) => e.approved && (!target || e.target === target));
}

function clearApproved(ownerUid: string, target?: UsedContextEntry["target"]) {
  writeStore(
    ownerUid,
    readStore(ownerUid).filter((e) => {
      if (!e.approved) return true;
      return target ? e.target !== target : false;
    }),
  );
}

function buildGenerationPayload(ownerUid: string) {
  const usedContext = getApproved(ownerUid, "studio");
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

function writeCompile(ownerUid: string, markdown: string, atomIds: string[]) {
  localStorageShim.setItem(
    compileKeyFor(ownerUid),
    JSON.stringify({
      markdown,
      fragmentAtomIds: atomIds,
      compiledAt: Date.now(),
      profileLink: { ownerUid, sourceTarget: "the-edit", version: 1 },
    }),
  );
}

function readCompile(ownerUid: string) {
  const raw = localStorageShim.getItem(compileKeyFor(ownerUid));
  return raw ? JSON.parse(raw) : null;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  const ownerA = "user_a";
  const ownerB = "user_b";
  localStorageShim.removeItem(keyFor(ownerA));
  localStorageShim.removeItem(keyFor(ownerB));
  localStorageShim.removeItem(compileKeyFor(ownerA));
  localStorageShim.removeItem(compileKeyFor(ownerB));

  const atom: MemoryAtom = {
    id: "atom_wo2_test",
    title: "Scribe capture — palette restraint",
    content: "Evidence: recurring negative space and warm paper tones across refs.",
    source: "scribe:test",
    tags: ["palette", "evidence"],
  };

  addToUsedContext(ownerA, atom, "studio");
  assert(readStore(ownerA).length === 1, "Expected one tray entry after Scribe send");
  assert(readStore(ownerA)[0].approved === false, "New entries start unapproved");

  setApproved(ownerA, atom.id, true, "studio");
  const payload = buildGenerationPayload(ownerA);
  assert(payload.fragmentIds.length === 1, "Approved atom should map to fragmentIds");
  assert(payload.usedContextSnapshots[0]?.title === atom.title, "Snapshot title preserved");

  clearApproved(ownerA, "studio");
  assert(getApproved(ownerA, "studio").length === 0, "Post-generation clear should remove approved studio context");
  assert(readStore(ownerA).length === 0, "Approved entry removed from tray after generation");

  addToUsedContext(ownerA, atom, "the-edit");
  setApproved(ownerA, atom.id, true, "the-edit");
  assert(getApproved(ownerA, "the-edit").length === 1, "Edit target tray independent from studio");
  assert(getApproved(ownerB, "the-edit").length === 0, "Second user should not see owner A context");

  writeCompile(ownerA, "# owner A compile", [atom.id]);
  writeCompile(ownerB, "# owner B compile", ["atom_b"]);
  assert(readCompile(ownerA)?.profileLink?.ownerUid === ownerA, "Compile profile link bound to owner A");
  assert(readCompile(ownerB)?.profileLink?.ownerUid === ownerB, "Compile profile link bound to owner B");
  assert(readCompile(ownerA)?.markdown !== readCompile(ownerB)?.markdown, "Compile payloads isolated per owner");

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
