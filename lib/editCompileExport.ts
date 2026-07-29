import type { UsedContextEntry } from "../types";

export const EDIT_COMPILE_DRAFT_KEY = "mimi_edit_compile_draft";
export const EDIT_COMPILE_EXPORT_KEY = "mimi_edit_compile_export";
export const EDITORIAL_COMPILE_CHANGED = "mimi:editorial-compile-export-changed";
const EDIT_PROFILE_LINK_VERSION = 1;

export interface EditProfileLink {
  version: number;
  ownerUid: string;
  ownerHandle?: string;
  workspaceId?: string;
  sourceTarget: "the-edit";
  linkedAt: number;
}

export interface CompileDraft {
  thesis: string;
  lead: string;
  excludedAtomIds: string[];
  profileLink?: EditProfileLink;
}

export interface EditorialCompileExport {
  markdown: string;
  thesis: string;
  lead: string;
  fragmentAtomIds: string[];
  compiledAt: number;
  profileLink: EditProfileLink;
}

export interface EditProfileIdentity {
  uid: string;
  handle?: string;
}

function getScopedKey(baseKey: string, uid: string): string {
  return `${baseKey}::${uid}`;
}

function resolveActiveProfileIdentity(): EditProfileIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("mimi_local_profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; handle?: string };
    if (!parsed?.uid) return null;
    return { uid: parsed.uid, handle: parsed.handle };
  } catch {
    return null;
  }
}

function buildProfileLink(identity: EditProfileIdentity): EditProfileLink {
  return {
    version: EDIT_PROFILE_LINK_VERSION,
    ownerUid: identity.uid,
    ownerHandle: identity.handle,
    sourceTarget: "the-edit",
    linkedAt: Date.now(),
  };
}

function ensureDraftShape(
  parsed: Partial<CompileDraft> | null | undefined,
  identity?: EditProfileIdentity | null,
): CompileDraft {
  const next: CompileDraft = {
    thesis: parsed?.thesis || "",
    lead: parsed?.lead || "",
    excludedAtomIds: Array.isArray(parsed?.excludedAtomIds) ? parsed!.excludedAtomIds : [],
  };
  if (identity?.uid) {
    next.profileLink = buildProfileLink(identity);
  }
  return next;
}

function isValidCompileExport(value: Partial<EditorialCompileExport> | null | undefined): value is EditorialCompileExport {
  if (!value) return false;
  if (!value.markdown?.trim()) return false;
  if (!Array.isArray(value.fragmentAtomIds)) return false;
  if (typeof value.compiledAt !== "number") return false;
  if (!value.profileLink?.ownerUid) return false;
  if (value.profileLink.sourceTarget !== "the-edit") return false;
  return true;
}

function migrateLegacyDraft(identity: EditProfileIdentity): void {
  const scopedKey = getScopedKey(EDIT_COMPILE_DRAFT_KEY, identity.uid);
  if (localStorage.getItem(scopedKey)) return;
  const legacy = localStorage.getItem(EDIT_COMPILE_DRAFT_KEY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy) as CompileDraft;
    const next = ensureDraftShape(parsed, identity);
    localStorage.setItem(scopedKey, JSON.stringify(next));
    localStorage.removeItem(EDIT_COMPILE_DRAFT_KEY);
  } catch {
    localStorage.removeItem(EDIT_COMPILE_DRAFT_KEY);
  }
}

function migrateLegacyCompile(identity: EditProfileIdentity): void {
  const scopedKey = getScopedKey(EDIT_COMPILE_EXPORT_KEY, identity.uid);
  if (localStorage.getItem(scopedKey)) return;
  const legacy = localStorage.getItem(EDIT_COMPILE_EXPORT_KEY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy) as Partial<EditorialCompileExport>;
    const next: EditorialCompileExport = {
      markdown: parsed.markdown || "",
      thesis: parsed.thesis || "",
      lead: parsed.lead || "",
      fragmentAtomIds: Array.isArray(parsed.fragmentAtomIds) ? parsed.fragmentAtomIds : [],
      compiledAt: parsed.compiledAt || Date.now(),
      profileLink: buildProfileLink(identity),
    };
    if (next.markdown.trim()) {
      localStorage.setItem(scopedKey, JSON.stringify(next));
    }
    localStorage.removeItem(EDIT_COMPILE_EXPORT_KEY);
  } catch {
    localStorage.removeItem(EDIT_COMPILE_EXPORT_KEY);
  }
}

function resolveIdentity(explicitUid?: string, explicitHandle?: string): EditProfileIdentity | null {
  if (explicitUid) return { uid: explicitUid, handle: explicitHandle };
  return resolveActiveProfileIdentity();
}

export function readCompileDraft(ownerUid?: string, ownerHandle?: string): CompileDraft {
  const identity = resolveIdentity(ownerUid, ownerHandle);
  try {
    if (!identity?.uid) return { thesis: "", lead: "", excludedAtomIds: [] };
    migrateLegacyDraft(identity);
    const scopedRaw = localStorage.getItem(getScopedKey(EDIT_COMPILE_DRAFT_KEY, identity.uid));
    if (!scopedRaw) return ensureDraftShape(null, identity);
    const parsed = JSON.parse(scopedRaw) as CompileDraft;
    if (parsed.profileLink?.ownerUid && parsed.profileLink.ownerUid !== identity.uid) {
      console.warn("MIMI // Edit compile draft owner mismatch, resetting draft.", {
        expected: identity.uid,
        received: parsed.profileLink.ownerUid,
      });
      return ensureDraftShape(null, identity);
    }
    return ensureDraftShape(parsed, identity);
  } catch {
    return ensureDraftShape(null, identity);
  }
}

export function writeCompileDraft(
  draft: CompileDraft,
  ownerUid?: string,
  ownerHandle?: string,
): void {
  const identity = resolveIdentity(ownerUid, ownerHandle);
  if (!identity?.uid) return;
  const next = ensureDraftShape(draft, identity);
  localStorage.setItem(getScopedKey(EDIT_COMPILE_DRAFT_KEY, identity.uid), JSON.stringify(next));
}

export function buildCompileMarkdown(
  thesis: string,
  lead: string,
  entries: UsedContextEntry[],
): string {
  const lines: string[] = ["# Editorial Read", ""];

  if (thesis.trim()) {
    lines.push(`> ${thesis.trim()}`, "");
  }

  if (lead.trim()) {
    lines.push(lead.trim(), "");
  }

  if (entries.length === 0) {
    lines.push("_No approved Scribe atoms in this compile._");
    return lines.join("\n");
  }

  lines.push("## Approved context", "");
  entries.forEach((entry, index) => {
    lines.push(`### ${index + 1}. ${entry.title}`);
    if (entry.source) {
      lines.push(`_Source: ${entry.source}_`, "");
    }
    lines.push(entry.content.trim(), "");
  });

  lines.push("---", `_Compiled in The Edit · ${new Date().toLocaleDateString()}_`);
  return lines.join("\n");
}

export function syncEditorialCompileExport(payload: EditorialCompileExport): void {
  if (!payload.profileLink?.ownerUid) {
    console.warn("MIMI // Rejecting compile export sync due to missing owner link.");
    return;
  }
  if (!isValidCompileExport(payload)) {
    console.warn("MIMI // Rejecting invalid compile export payload.");
    return;
  }
  localStorage.setItem(
    getScopedKey(EDIT_COMPILE_EXPORT_KEY, payload.profileLink.ownerUid),
    JSON.stringify(payload),
  );
  window.dispatchEvent(new CustomEvent(EDITORIAL_COMPILE_CHANGED));
}

export function getEditorialCompileExport(
  ownerUid?: string,
  strictOwner: boolean = true,
): EditorialCompileExport | null {
  const identity = resolveIdentity(ownerUid);
  try {
    if (!identity?.uid) return null;
    migrateLegacyCompile(identity);
    const raw = localStorage.getItem(getScopedKey(EDIT_COMPILE_EXPORT_KEY, identity.uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorialCompileExport>;
    if (!isValidCompileExport(parsed)) {
      console.warn("MIMI // Dropping invalid compile export payload.");
      return null;
    }
    if (strictOwner && parsed.profileLink.ownerUid !== identity.uid) {
      console.warn("MIMI // Compile export owner mismatch.", {
        expected: identity.uid,
        received: parsed.profileLink.ownerUid,
      });
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearEditorialCompileExport(ownerUid?: string): void {
  const identity = resolveIdentity(ownerUid);
  if (identity?.uid) {
    localStorage.removeItem(getScopedKey(EDIT_COMPILE_EXPORT_KEY, identity.uid));
    localStorage.removeItem(getScopedKey(EDIT_COMPILE_DRAFT_KEY, identity.uid));
  }
  localStorage.removeItem(EDIT_COMPILE_EXPORT_KEY);
  localStorage.removeItem(EDIT_COMPILE_DRAFT_KEY);
  window.dispatchEvent(new CustomEvent(EDITORIAL_COMPILE_CHANGED));
}

export function clearLegacyEditCompileState(): void {
  localStorage.removeItem(EDIT_COMPILE_EXPORT_KEY);
  localStorage.removeItem(EDIT_COMPILE_DRAFT_KEY);
  window.dispatchEvent(new CustomEvent(EDITORIAL_COMPILE_CHANGED));
}
