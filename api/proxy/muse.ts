import { cors, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";

const defaultMuseUrl = "https://meta.ai/v1/muse/generate";

const extractPdfUrl = (payload: any): string => {
  if (!payload || typeof payload !== "object") return "";
  const candidates = [
    payload.pdf_url,
    payload.pdfUrl,
    payload.pdf?.url,
    payload.assets?.pdf,
    payload.assets?.pdf_url,
    payload.output?.pdf_url,
    payload.output?.pdf?.url,
  ];
  return String(candidates.find((value) => typeof value === "string" && value.trim()) || "");
};

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const apiKey = String(process.env.MUSE_API_KEY || "").trim();
    const museUrl = String(process.env.MUSE_API_URL || defaultMuseUrl).trim();

    if (!apiKey) {
      return sendJson(res, 403, {
        error: {
          message:
            "Muse Spark requires server-side MUSE_API_KEY. This provider is experimental/private-preview and is not available through the browser key ring.",
        },
      });
    }

    const upstream = await fetch(museUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(await readJsonBody(req)),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";

    if (!contentType.includes("application/json")) {
      return sendText(res, upstream.status, text, contentType);
    }

    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return sendJson(res, 502, {
        error: { message: "Muse Spark returned malformed JSON.", upstreamStatus: upstream.status },
        raw: text,
      });
    }

    return sendJson(res, upstream.status, {
      ...payload,
      pdf_url: extractPdfUrl(payload),
      provider: "muse_spark",
      endpoint: museUrl,
    });
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
