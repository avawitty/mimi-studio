import {
  cors,
  providerKey,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
} from "../../lib/apiUtils.js";
import { getServerAiGatewayKey, mapGeminiVoiceToGateway } from "../../lib/aiGatewayCompat.js";
import { modelFor } from "../../services/modelConfig.js";

/**
 * Mint a short-lived realtime session for the Oracle Cyberdeck.
 *
 * Preferred path: Vercel AI Gateway realtime (`gateway.experimental_realtime.getToken`)
 * with funded-gateway credit metering — no GEMINI_API_KEY required.
 *
 * Escape hatches:
 * - BYOK Gemini via x-api-key → Gemini ephemeral auth token (legacy live SDK path)
 * - MIMI_LIVE_ALLOW_UNAUTH=true for local smoke tests only
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const funded = await import("../../lib/mimiFundedGateway.js");
    const liveCost = funded.fundedGatewayCreditCost(
      Number(process.env.MIMI_LIVE_CREDIT_COST || 2),
    );
    const headerKey = String(req.headers["x-api-key"] || "").trim();
    const body = await readJsonBody(req).catch(() => ({}));
    const sessionConfig = (body?.sessionConfig || {}) as Record<string, unknown>;
    const gatewayVoice = mapGeminiVoiceToGateway(String(sessionConfig.voice || ""));

    let access: Awaited<ReturnType<typeof funded.resolveMimiFundedGatewayAccess>> | null =
      null;

    // ── BYOK Gemini: legacy ephemeral token for direct GoogleGenAI live.connect ──
    if (headerKey && headerKey !== "undefined") {
      const model = modelFor("live", "gemini");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: headerKey,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
          httpOptions: { apiVersion: "v1alpha" },
        },
      });

      if (!token?.name) {
        return sendError(res, 502, "Gemini did not return a live session token.", "LIVE_TOKEN_EMPTY");
      }

      return sendJson(res, 200, {
        token: token.name,
        model,
        apiVersion: "v1alpha",
        provider: "gemini",
        expireTime,
        newSessionExpireTime,
      });
    }

    // ── Funded AI Gateway realtime (preferred) ──
    const gatewayKey = getServerAiGatewayKey();
    if (gatewayKey) {
      access = await funded.resolveMimiFundedGatewayAccess(req, liveCost);
      const allowUnauth = process.env.MIMI_LIVE_ALLOW_UNAUTH === "true";

      if (!access.allowed && !allowUnauth) {
        if (access.uid) {
          return sendError(
            res,
            402,
            "Insufficient credits for voice communion.",
            "LIVE_CREDITS",
          );
        }
        return sendError(
          res,
          403,
          "Sign in or add a Gemini key in Settings to initiate vocal sync.",
          "LIVE_AUTH_REQUIRED",
        );
      }

      const liveModel = modelFor("live", "gateway");
      const { createGateway } = await import("ai");
      const gatewayProvider = createGateway({ apiKey: gatewayKey });
      const { token, url } = await gatewayProvider.experimental_realtime.getToken({
        model: liveModel,
      });

      if (access?.billable) {
        await funded.chargeMimiFundedGateway(access, {
          model: liveModel,
          feature: "gateway-live-realtime",
        });
      }

      return sendJson(res, 200, {
        token,
        url,
        model: liveModel,
        provider: "gateway",
        tools: [],
        sessionConfig: {
          voice: gatewayVoice || "alloy",
          instructions: String(sessionConfig.instructions || ""),
          turnDetection: sessionConfig.turnDetection || { type: "server-vad" },
        },
      });
    }

    // ── Fallback: server Gemini ephemeral when gateway is not configured ──
    const serverGeminiKey =
      String(process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim() ||
      providerKey(req, "gemini");

    if (!serverGeminiKey) {
      return sendError(
        res,
        503,
        "Voice sync unavailable: configure AI_GATEWAY_API_KEY (preferred) or GEMINI_API_KEY.",
        "LIVE_KEY_MISSING",
      );
    }

    access = await funded.resolveMimiFundedGatewayAccess(req, liveCost);
    if (!access.allowed) {
      if (process.env.MIMI_LIVE_ALLOW_UNAUTH === "true") {
        access = null;
      } else if (access.uid) {
        return sendError(
          res,
          402,
          "Insufficient credits for voice communion.",
          "LIVE_CREDITS",
        );
      } else {
        return sendError(
          res,
          403,
          "Sign in or add a Gemini key in Settings to initiate vocal sync.",
          "LIVE_AUTH_REQUIRED",
        );
      }
    }

    const model = modelFor("live", "gemini");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: serverGeminiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    if (!token?.name) {
      return sendError(res, 502, "Gemini did not return a live session token.", "LIVE_TOKEN_EMPTY");
    }

    if (access?.billable) {
      await funded.chargeMimiFundedGateway(access, {
        model,
        feature: "gemini-live-ephemeral",
      });
    }

    return sendJson(res, 200, {
      token: token.name,
      model,
      apiVersion: "v1alpha",
      provider: "gemini",
      expireTime,
      newSessionExpireTime,
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error("MIMI // Live token mint failed:", message);
    return sendError(res, 502, message || "Failed to mint live session token.", "LIVE_TOKEN_FAILED");
  }
}
