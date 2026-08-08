import {
  buildPublicSignatureSeo,
  extractApprovedPublicSignature,
  renderPublicSignatureOgHtml,
} from "../../lib/signature/publicSignature.js";
import { sendJson } from "../../lib/apiUtils.js";

type FirestoreLike = {
  collection: (path: string) => {
    where: (field: string, op: string, value: string) => {
      limit: (n: number) => { get: () => Promise<QuerySnapLike> };
    };
  };
};

type QuerySnapLike = {
  empty: boolean;
  docs: Array<{ id: string; data: () => Record<string, unknown> }>;
};

async function loadProfileByHandle(
  db: FirestoreLike,
  handle: string,
): Promise<Record<string, unknown> | null> {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  if (!normalized) return null;
  const snap = await db
    .collection("profiles_public")
    .where("handle", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() || null;
}

export default async function handler(req: any, res: any) {
  try {
    const handle = String(req.query?.handle || "").trim();
    if (!handle) {
      return sendJson(res, 400, { error: "handle query parameter required" });
    }

    const configuredBase = String(process.env.MIMI_PUBLIC_BASE_URL || "https://www.mimi.you").replace(
      /\/$/,
      "",
    );

    const { getServerFirebaseAdmin } = await import("../../lib/serverFirebaseAdmin.js");
    const { db } = getServerFirebaseAdmin();

    let profile: Record<string, unknown> | null = null;
    if (db) {
      profile = await loadProfileByHandle(db as FirestoreLike, handle);
    }

    const signature = extractApprovedPublicSignature(profile);
    const imageFallback =
      typeof (profile?.publicShowcase as Record<string, unknown> | undefined)?.dollPortraitUrl ===
      "string"
        ? String((profile?.publicShowcase as Record<string, unknown>).dollPortraitUrl)
        : undefined;

    const seo = buildPublicSignatureSeo(handle, signature, {
      baseUrl: configuredBase,
      imageFallback,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.end(renderPublicSignatureOgHtml(seo));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  }
}
