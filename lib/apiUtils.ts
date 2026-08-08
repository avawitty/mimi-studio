import { getServerAiGatewayKey } from "./aiGatewayCompat.js";

export const readJsonBody = async (req: any) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const sendJson = (res: any, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

/**
 * Standard error envelope used across all API handlers: { error: { message, code? } }.
 * Use this instead of ad-hoc `{ error: "string" }` shapes so clients can rely on one format.
 */
export const sendError = (
  res: any,
  status: number,
  message: string,
  code?: string,
) => {
  sendJson(res, status, { error: { message, ...(code ? { code } : {}) } });
};

/**
 * Validate `data` against a zod schema. On success returns the parsed value.
 * On failure it sends a 400 with the standard error envelope and returns null,
 * so callers can early-return: `const parsed = validateBody(res, schema, body); if (!parsed) return;`
 */
export const validateBody = <T>(
  res: any,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: any } },
  data: unknown,
): T | null => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error?.issues?.[0];
    const path = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
    sendError(res, 400, `${path}${issue?.message || "Invalid request body"}`, "INVALID_BODY");
    return null;
  }
  return result.data as T;
};

export const sendText = (res: any, status: number, text: string, contentType = "text/plain; charset=utf-8") => {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.end(text);
};

export const cors = (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-user-token, x-user-id, x-mimi-ingest-key, anthropic-version",
  );
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
};

export const serverAiEnabled = () =>
  process.env.MIMI_ENABLE_SERVER_AI === "true" ||
  process.env.MIMI_ENABLE_SERVER_AI === "1";

export const providerKey = (req: any, provider: "gemini" | "anthropic" | "openai" | "replicate" | "openrouter" | "gateway") => {
  const headerKey = String(req.headers["x-api-key"] || "").trim();
  if (provider !== "openai" && headerKey && headerKey !== "undefined") return headerKey;

  const authHeader = String(req.headers.authorization || "").trim();
  if ((provider === "openai" || provider === "replicate" || provider === "openrouter" || provider === "gateway") && authHeader && authHeader !== "Bearer undefined") {
    return authHeader.replace(/^Bearer\s+/i, "");
  }

  // Gateway env key is independently gated by funded-credit / BYOK flows.
  // Do not require MIMI_ENABLE_SERVER_AI — Vercel serverless does not run
  // server.ts auto-enable, and image routes that prefer the gateway would
  // otherwise silently fall into Simulated Mirror Mode.
  if (provider === "gateway") {
    return getServerAiGatewayKey();
  }

  if (!serverAiEnabled()) return "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (provider === "replicate") return process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "";
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
};

export const requireMethod = (req: any, res: any, method: string) => {
  if (req.method === method) return true;
  sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  return false;
};
