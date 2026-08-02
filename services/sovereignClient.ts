import type { ZineMetadata } from "../types";

type CommunityResponse = {
  zines?: ZineMetadata[];
  count?: number;
  error?: { message?: string; code?: string };
};

const ingestHeaders = (userId?: string): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) headers["x-user-id"] = userId;
  return headers;
};

/** Fetch public Floor from the sovereign Express archive. Returns null on miss/disabled. */
export const fetchSovereignCommunityZines = async (
  count: number,
): Promise<ZineMetadata[] | null> => {
  try {
    const res = await fetch(`/api/sovereign/community?limit=${encodeURIComponent(String(count))}`, {
      credentials: "same-origin",
    });
    if (res.status === 503) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as CommunityResponse;
    if (!Array.isArray(data.zines)) return null;
    return data.zines;
  } catch {
    return null;
  }
};

/** Mirror a published zine into the sovereign archive (best-effort, never throws). */
export const mirrorZineToSovereign = async (zine: ZineMetadata): Promise<boolean> => {
  if (!zine?.id || !zine.isPublic) return false;
  try {
    const res = await fetch("/api/sovereign/zines", {
      method: "POST",
      credentials: "same-origin",
      headers: ingestHeaders(zine.userId),
      body: JSON.stringify({ zine }),
    });
    return res.ok;
  } catch (error) {
    console.warn("MIMI // Sovereign mirror failed:", error);
    return false;
  }
};

export const fetchSovereignZineById = async (id: string): Promise<ZineMetadata | null> => {
  if (!id) return null;
  try {
    const res = await fetch(`/api/sovereign/zines/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { zine?: ZineMetadata };
    return data.zine || null;
  } catch {
    return null;
  }
};
