import { GoogleGenAI } from "@google/genai";
import {
  cors,
  providerKey,
  requireMethod,
  sendError,
  sendJson,
  serverAiEnabled,
} from "../../lib/apiUtils.js";
import {
  chargeMimiFundedGateway,
  fundedGatewayCreditCost,
  resolveMimiFundedGatewayAccess,
} from "../../lib/mimiFundedGateway.js";
import { modelFor } from "../../services/modelConfig.js";

/**
 * Mint a short-lived Gemini Live ephemeral token for browser WebSocket sessions.
 * Live cannot route through the HTTP AI Gateway proxy — the client connects
 * directly to Google with this token (or a BYOK key).
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const liveCost = fundedGatewayCreditCost(
      Number(process.env.MIMI_LIVE_CREDIT_COST || 2),
    );
    const headerKey = String(req.headers["x-api-key"] || "").trim();
    const model = modelFor("live", "gemini");

    let mintKey = "";
    let access: Awaited<ReturnType<typeof resolveMimiFundedGatewayAccess>> | null =
      null;

    if (headerKey && headerKey !== "undefined") {
      mintKey = headerKey;
    } else {
      // Live ephemeral tokens require a real Gemini Developer API key —
      // the AI Gateway key cannot mint them. Read env directly so voice
      // works even when MIMI_ENABLE_SERVER_AI is off for other providers.
      const serverKey =
        String(process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim() ||
        providerKey(req, "gemini");
      if (!serverKey) {
        return sendError(
          res,
          503,
          "Voice sync unavailable: configure GEMINI_API_KEY or add a Gemini key in Settings.",
          "LIVE_KEY_MISSING",
        );
      }

      access = await resolveMimiFundedGatewayAccess(req, liveCost);
      if (access.allowed) {
        mintKey = serverKey;
      } else if (serverAiEnabled()) {
        // Local / server-AI mode mirrors the HTTP Gemini proxy fallback.
        mintKey = serverKey;
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

    const ai = new GoogleGenAI({
      apiKey: mintKey,
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
      await chargeMimiFundedGateway(access, {
        model,
        feature: "gemini-live-ephemeral",
      });
    }

    return sendJson(res, 200, {
      token: token.name,
      model,
      apiVersion: "v1alpha",
      expireTime,
      newSessionExpireTime,
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error("MIMI // Live token mint failed:", message);
    return sendError(res, 502, message || "Failed to mint live session token.", "LIVE_TOKEN_FAILED");
  }
}
