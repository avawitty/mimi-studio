import { getOpenAiAppsChallenge } from "../lib/openaiAppsChallenge.js";

export default function handler(req: any, res: any) {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end("Method not allowed");
    return;
  }

  const challenge = getOpenAiAppsChallenge();
  if (!challenge) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("OpenAI apps challenge is not configured.\n");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(`${challenge}\n`);
}
