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

export const sendText = (res: any, status: number, text: string, contentType = "text/plain; charset=utf-8") => {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.end(text);
};

export const cors = (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-user-token, anthropic-version");
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

  if (!serverAiEnabled()) return "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (provider === "replicate") return process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "";
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY || "";
  if (provider === "gateway") return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || "";
  return process.env.OPENAI_API_KEY || "";
};

export const requireMethod = (req: any, res: any, method: string) => {
  if (req.method === method) return true;
  sendJson(res, 405, { error: { message: `Method ${req.method} not allowed` } });
  return false;
};
