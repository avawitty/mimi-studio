import * as cheerio from "cheerio";

export interface PinterestPreviewPin {
  id: string;
  src: string;
  alt: string;
  url?: string;
  sourceUrl?: string;
}

export interface PinterestPublicBoardPreview {
  title: string;
  url: string;
  pins: PinterestPreviewPin[];
  source: "public_html";
  limited: boolean;
  warning?: string;
}

type Candidate = PinterestPreviewPin & { rank: number };

const PINIMG_HOST = "i.pinimg.com";
const IMAGE_EXTENSION = /\.(?:avif|jpe?g|png|webp)(?:$|\?)/i;
const PROFILE_IMAGE_PATH = /\/(?:30x30|60x60|75x75_RS|140x140_RS)\//i;

function isPinterestHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "pin.it" ||
    host === "pinterest.com" ||
    host.endsWith(".pinterest.com")
  );
}

export function parsePinterestBoardUrl(rawUrl: string): URL {
  const candidate = rawUrl.trim();
  if (!candidate) throw new Error("Paste a Pinterest board URL first.");

  let parsed: URL;
  try {
    parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`,
    );
  } catch {
    throw new Error("That does not look like a valid Pinterest URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Pinterest previews require an HTTP or HTTPS URL.");
  }
  if (!isPinterestHost(parsed.hostname)) {
    throw new Error("Only pinterest.com and pin.it collection links are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Pinterest URLs cannot include embedded credentials.");
  }

  parsed.hash = "";
  return parsed;
}

function cleanText(value = ""): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function decodeUrl(value = ""): string {
  return value
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .trim();
}

function pinImageId(url: URL): string {
  const filename = url.pathname.split("/").filter(Boolean).at(-1) || "";
  return filename.replace(/\.[a-z0-9]+$/i, "") || url.pathname;
}

function imageRank(url: URL, widthHint = 0): number {
  if (/\/originals\//i.test(url.pathname)) return Math.max(widthHint, 1200);
  const size = url.pathname.match(/\/(\d{2,4})x(?:\d+)?\//i)?.[1];
  return Math.max(widthHint, size ? Number(size) : 0);
}

function pinterestLink(
  value: string | undefined,
  boardUrl: string,
): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, boardUrl);
    return isPinterestHost(parsed.hostname) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeImageCandidate(
  rawSrc: string,
  boardUrl: string,
  alt: string,
  link?: string,
  widthHint = 0,
): Candidate | null {
  try {
    const parsed = new URL(decodeUrl(rawSrc), boardUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== PINIMG_HOST) return null;
    if (
      !IMAGE_EXTENSION.test(parsed.toString()) ||
      PROFILE_IMAGE_PATH.test(parsed.pathname)
    ) {
      return null;
    }

    return {
      id: pinImageId(parsed),
      src: parsed.toString(),
      alt: cleanText(alt) || "Pinterest reference",
      url: pinterestLink(link, boardUrl),
      sourceUrl: boardUrl,
      rank: imageRank(parsed, widthHint),
    };
  } catch {
    return null;
  }
}

function srcsetCandidates(
  value = "",
): Array<{ src: string; width: number }> {
  return value
    .split(",")
    .map((entry) => entry.trim().match(/^(\S+)(?:\s+(\d+)w)?/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ src: match[1], width: Number(match[2] || 0) }));
}

export function extractPinterestBoardPreview(
  html: string,
  boardUrl: string,
): PinterestPublicBoardPreview {
  const $ = cheerio.load(html);
  const title = cleanText(
    $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      "Pinterest board",
  ).replace(/\s*[|·]\s*Pinterest\s*$/i, "");
  const candidates = new Map<string, Candidate>();

  const add = (candidate: Candidate | null) => {
    if (!candidate) return;
    const current = candidates.get(candidate.id);
    if (
      !current ||
      candidate.rank > current.rank ||
      (candidate.rank === current.rank &&
        candidate.alt.length > current.alt.length)
    ) {
      candidates.set(candidate.id, candidate);
    }
  };

  $("img").each((_index, element) => {
    const image = $(element);
    const alt =
      image.attr("alt") ||
      image.attr("aria-label") ||
      image.attr("title") ||
      "";
    const link = image.closest("a").attr("href");

    for (const attribute of ["src", "data-src"]) {
      const src = image.attr(attribute);
      if (src) add(normalizeImageCandidate(src, boardUrl, alt, link));
    }
    for (const attribute of ["srcset", "data-srcset"]) {
      for (const source of srcsetCandidates(image.attr(attribute))) {
        add(
          normalizeImageCandidate(
            source.src,
            boardUrl,
            alt,
            link,
            source.width,
          ),
        );
      }
    }
  });

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    add(
      normalizeImageCandidate(
        ogImage,
        boardUrl,
        $('meta[property="og:description"]').attr("content") || title,
      ),
    );
  }

  const pins = [...candidates.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 30)
    .map(({ rank: _rank, ...pin }) => pin);
  const limited = pins.length < 3;

  return {
    title: title || "Pinterest board",
    url: boardUrl,
    pins,
    source: "public_html",
    limited,
    warning: limited
      ? "Pinterest returned a limited public preview. Connect Pinterest with boards:read and pins:read for complete board access."
      : undefined,
  };
}

export async function fetchPinterestBoardPreview(
  rawUrl: string,
): Promise<PinterestPublicBoardPreview> {
  const requested = parsePinterestBoardUrl(rawUrl);
  const response = await fetch(requested.toString(), {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Pinterest returned ${response.status} while loading that board.`);
  }

  const resolved = parsePinterestBoardUrl(response.url || requested.toString());
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Pinterest did not return a public board page.");
  }

  const html = await response.text();
  const preview = extractPinterestBoardPreview(html, resolved.toString());
  if (!preview.pins.length) {
    throw new Error(
      "No public thumbnails were exposed by Pinterest. Confirm the board is public, or connect Pinterest for complete access.",
    );
  }
  return preview;
}
