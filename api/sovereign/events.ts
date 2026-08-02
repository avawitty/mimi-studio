import { cors, requireMethod, sendError } from "../../lib/apiUtils.js";
import { resolveSovereignRequesterUid } from "../../lib/sovereign/auth.js";
import { isSovereignEnabled } from "../../lib/sovereign/db.js";
import { subscribeSovereignEvents } from "../../lib/sovereign/events.js";
import { sovereignStatus } from "../../lib/sovereign/store.js";

/**
 * GET /api/sovereign/events
 * Server-Sent Events stream for live Floor / Mine updates on long-lived Express hosts.
 * (Vercel serverless is a poor fit — clients fall back to polling there.)
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  if (!isSovereignEnabled()) {
    return sendError(res, 503, "Sovereign archive disabled on this host.", "SOVEREIGN_DISABLED");
  }

  const scope = String(req.query?.scope || "public"); // public | user
  const userId = String(req.query?.userId || "").trim();

  if (scope === "user") {
    if (!userId) {
      return sendError(res, 400, "userId required for scope=user", "MISSING_USER_ID");
    }
    const requester = await resolveSovereignRequesterUid(req);
    if (!requester || requester.uid !== userId) {
      return sendError(res, 401, "Authentication required for user-scoped events", "UNAUTHORIZED");
    }
  }

  // If this is a classic Node ServerResponse, stream SSE.
  if (typeof res.writeHead === "function" && typeof res.write === "function") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Mimi-Archive": "sovereign",
    });

    const status = await sovereignStatus();
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, archive: status })}\n\n`);

    const unsubscribe = subscribeSovereignEvents((event) => {
      if (scope === "public") {
        // Include unpublish (isPublic:false) so Floor clients refetch and drop it.
        if (event.type === "zine_upsert" || event.type === "zine_delete") {
          res.write(`event: zine\ndata: ${JSON.stringify(event)}\n\n`);
        }
        return;
      }
      if (scope === "user" && userId) {
        if (
          (event.type === "zine_upsert" || event.type === "zine_delete") &&
          event.userId === userId
        ) {
          res.write(`event: zine\ndata: ${JSON.stringify(event)}\n\n`);
        }
        if (
          (event.type === "pocket_upsert" || event.type === "pocket_delete") &&
          event.userId === userId
        ) {
          res.write(`event: pocket\ndata: ${JSON.stringify(event)}\n\n`);
        }
      }
    });

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        unsubscribe();
      }
    }, 25_000);

    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      try {
        res.end();
      } catch {
        // ignore
      }
    };

    req.on?.("close", close);
    res.on?.("close", close);
    return;
  }

  // Serverless / non-streaming fallback — client should poll.
  return sendError(
    res,
    501,
    "SSE requires the long-lived Express host. Poll /api/sovereign/community instead.",
    "SSE_UNSUPPORTED",
  );
}
