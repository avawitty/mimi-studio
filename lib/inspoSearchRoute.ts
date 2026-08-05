import { cors, sendJson } from "./apiUtils.js";
import {
  compileStockSearchQuery,
  searchUnsplashPhoto,
  searchUnsplashPhotos,
} from "./unsplashClient.js";

export async function handleInspoSearchRoute(req: any, res: any) {
  if (cors(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const query = String(req.query?.q || req.query?.query || "").trim();
  if (!query) {
    return sendJson(res, 400, { error: "Search query required" });
  }

  const pageParam = Number(req.query?.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limitParam = Number(req.query?.limit);
  const limit =
    Number.isFinite(limitParam) && limitParam > 1
      ? Math.min(12, Math.floor(limitParam))
      : 1;

  try {
    if (limit > 1) {
      const photos = await searchUnsplashPhotos(query, undefined, {
        page,
        perPage: limit,
      });
      if (!photos.length) {
        return sendJson(res, 404, {
          error: "No stock photos matched that query",
          compiledQuery: compileStockSearchQuery(query),
        });
      }
      return sendJson(res, 200, {
        results: photos,
        compiledQuery: compileStockSearchQuery(query),
      });
    }

    const photo = await searchUnsplashPhoto(query, undefined, { page });
    if (!photo) {
      return sendJson(res, 404, {
        error: "No stock photo matched that query",
        compiledQuery: compileStockSearchQuery(query),
      });
    }
    return sendJson(res, 200, photo);
  } catch (error: any) {
    const message = error?.message || String(error);
    const missingKey = /unsplash|client-id|401|403/i.test(message);
    return sendJson(res, missingKey ? 503 : 502, {
      error: message,
      hint: missingKey
        ? "Configure UNSPLASH_ACCESS_KEY on the server for photography-first zine plates."
        : undefined,
    });
  }
}
