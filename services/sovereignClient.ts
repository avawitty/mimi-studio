import { auth } from "./firebaseInit";
import type { PocketItem, UserProfile, ZineMetadata } from "../types";

export type SovereignArchiveStatus = {
  enabled?: boolean;
  ready?: boolean;
  publicCount?: number;
  zineCount?: number;
  profileCount?: number;
  pocketCount?: number;
  message?: string;
};

type CommunityResponse = {
  zines?: ZineMetadata[];
  count?: number;
  archive?: SovereignArchiveStatus;
  error?: { message?: string; code?: string };
};

let cachedStatus: { at: number; value: SovereignArchiveStatus | null } = {
  at: 0,
  value: null,
};

const authHeaders = async (userId?: string): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) headers["x-user-id"] = userId;
  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-user-token"] = token;
    }
  } catch {
    // ignore token failures — soft header may still work locally
  }
  return headers;
};

export const fetchSovereignStatus = async (
  force = false,
): Promise<SovereignArchiveStatus | null> => {
  if (!force && cachedStatus.value && Date.now() - cachedStatus.at < 15_000) {
    return cachedStatus.value;
  }
  try {
    const res = await fetch("/api/sovereign/status", { credentials: "same-origin" });
    if (!res.ok) {
      cachedStatus = { at: Date.now(), value: null };
      return null;
    }
    const data = (await res.json()) as SovereignArchiveStatus;
    cachedStatus = { at: Date.now(), value: data };
    return data;
  } catch {
    cachedStatus = { at: Date.now(), value: null };
    return null;
  }
};

/** True when sovereign is online — Floor should not need Firestore. */
export const isSovereignOnline = async (): Promise<boolean> => {
  const status = await fetchSovereignStatus();
  return Boolean(status?.ready);
};

/** Fetch public Floor from the sovereign Express archive. Returns null on miss/disabled. */
export const fetchSovereignCommunityZines = async (
  count: number,
  queryText = "",
): Promise<ZineMetadata[] | null> => {
  try {
    const params = new URLSearchParams({
      limit: String(count),
    });
    if (queryText.trim()) params.set("q", queryText.trim());
    const res = await fetch(`/api/sovereign/community?${params}`, {
      credentials: "same-origin",
    });
    if (res.status === 503) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as CommunityResponse;
    if (data.archive) {
      cachedStatus = { at: Date.now(), value: data.archive };
    }
    if (!Array.isArray(data.zines)) return null;
    return data.zines;
  } catch {
    return null;
  }
};

/** Mirror a zine into the sovereign archive (public or private owner copy). */
export const mirrorZineToSovereign = async (zine: ZineMetadata): Promise<boolean> => {
  if (!zine?.id || !zine.userId) return false;
  try {
    const res = await fetch("/api/sovereign/zines", {
      method: "POST",
      credentials: "same-origin",
      headers: await authHeaders(zine.userId),
      body: JSON.stringify({ zine }),
    });
    if (res.ok) cachedStatus = { at: 0, value: null };
    return res.ok;
  } catch (error) {
    console.warn("MIMI // Sovereign mirror failed:", error);
    return false;
  }
};

/** Remove a zine from the sovereign archive (Mine + Floor). */
export const deleteZineFromSovereign = async (
  zineId: string,
  userId?: string,
): Promise<boolean> => {
  if (!zineId) return false;
  try {
    const uid = userId || auth.currentUser?.uid || "";
    const params = new URLSearchParams({ id: zineId });
    if (uid) params.set("userId", uid);
    const res = await fetch(`/api/sovereign/zines/${encodeURIComponent(zineId)}?${params}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: await authHeaders(uid || undefined),
    });
    if (res.ok) cachedStatus = { at: 0, value: null };
    return res.ok;
  } catch (error) {
    console.warn("MIMI // Sovereign delete failed:", error);
    return false;
  }
};

export const fetchSovereignZineById = async (id: string): Promise<ZineMetadata | null> => {
  if (!id) return null;
  try {
    const headers = await authHeaders(auth.currentUser?.uid || undefined);
    const res = await fetch(`/api/sovereign/zines/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
      headers,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { zine?: ZineMetadata };
    return data.zine || null;
  } catch {
    return null;
  }
};

export const fetchSovereignUserZines = async (
  userId: string,
  opts?: { publicOnly?: boolean; limit?: number },
): Promise<ZineMetadata[] | null> => {
  if (!userId) return null;
  try {
    const params = new URLSearchParams({
      userId,
      publicOnly: opts?.publicOnly === false ? "0" : "1",
      limit: String(opts?.limit || 100),
    });
    const res = await fetch(`/api/sovereign/zines?${params}`, {
      credentials: "same-origin",
      headers: await authHeaders(userId),
    });
    if (res.status === 503) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { zines?: ZineMetadata[] };
    return Array.isArray(data.zines) ? data.zines : null;
  } catch {
    return null;
  }
};

export const mirrorProfileToSovereign = async (profile: UserProfile): Promise<boolean> => {
  if (!profile?.uid) return false;
  try {
    const res = await fetch("/api/sovereign/profile", {
      method: "POST",
      credentials: "same-origin",
      headers: await authHeaders(profile.uid),
      body: JSON.stringify({ profile }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const fetchSovereignProfileByHandle = async (
  handle: string,
): Promise<UserProfile | null> => {
  if (!handle) return null;
  try {
    const res = await fetch(
      `/api/sovereign/profile?handle=${encodeURIComponent(handle.toLowerCase())}`,
      { credentials: "same-origin" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: UserProfile };
    return data.profile || null;
  } catch {
    return null;
  }
};

export const fetchSovereignProfileByUid = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  try {
    const res = await fetch(`/api/sovereign/profile?uid=${encodeURIComponent(uid)}`, {
      credentials: "same-origin",
      headers: await authHeaders(uid),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: UserProfile };
    return data.profile || null;
  } catch {
    return null;
  }
};

export const mirrorPocketItemToSovereign = async (item: PocketItem): Promise<boolean> => {
  if (!item?.id || !item.userId) return false;
  try {
    const res = await fetch("/api/sovereign/pocket", {
      method: "POST",
      credentials: "same-origin",
      headers: await authHeaders(item.userId),
      body: JSON.stringify({ item }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteSovereignPocketItem = async (
  itemId: string,
  userId: string,
): Promise<boolean> => {
  if (!itemId || !userId) return false;
  try {
    const params = new URLSearchParams({ id: itemId, userId });
    const res = await fetch(`/api/sovereign/pocket?${params}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: await authHeaders(userId),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const fetchSovereignPocketItems = async (
  userId: string,
): Promise<PocketItem[] | null> => {
  if (!userId) return null;
  try {
    const res = await fetch(
      `/api/sovereign/pocket?userId=${encodeURIComponent(userId)}`,
      {
        credentials: "same-origin",
        headers: await authHeaders(userId),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: PocketItem[] };
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
};

export type SovereignLiveScope = "public" | "user";

export type SovereignLiveHandlers = {
  onZine?: () => void;
  onPocket?: () => void;
  onHello?: (payload: unknown) => void;
  onUnsupported?: () => void;
};

/**
 * Live Floor / Mine updates via SSE on long-lived Express hosts.
 * Returns null when EventSource is unavailable; callers should poll.
 * On Vercel/serverless the route returns 501 — onerror fires onUnsupported.
 */
export const subscribeSovereignLive = (
  scope: SovereignLiveScope,
  handlers: SovereignLiveHandlers,
  opts?: { userId?: string },
): (() => void) | null => {
  if (typeof EventSource === "undefined") return null;

  const params = new URLSearchParams({ scope });
  if (scope === "user" && opts?.userId) {
    params.set("userId", opts.userId);
  }

  let closed = false;
  let es: EventSource;
  try {
    es = new EventSource(`/api/sovereign/events?${params}`, {
      withCredentials: true,
    } as EventSourceInit);
  } catch {
    return null;
  }

  let sawHello = false;
  es.addEventListener("hello", (ev) => {
    sawHello = true;
    try {
      handlers.onHello?.(JSON.parse((ev as MessageEvent).data || "{}"));
    } catch {
      handlers.onHello?.(null);
    }
  });
  es.addEventListener("zine", () => {
    handlers.onZine?.();
  });
  es.addEventListener("pocket", () => {
    handlers.onPocket?.();
  });
  es.onerror = () => {
    // First connection failure on serverless → fall back to polling.
    if (!sawHello && !closed) {
      handlers.onUnsupported?.();
      closed = true;
      es.close();
    }
  };

  return () => {
    closed = true;
    es.close();
  };
};
