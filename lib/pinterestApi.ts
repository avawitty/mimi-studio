import {
  parsePinterestBoardUrl,
  type PinterestPreviewPin,
  type PinterestPublicBoardPreview,
} from "./pinterestBoardPreview.js";

export type PinterestPreviewSource = "pinterest_api" | "public_html";

export interface PinterestBoardPath {
  username: string;
  boardSlug: string;
  boardUrl: string;
}

interface PinterestBoardRecord {
  id: string;
  name?: string;
  description?: string;
  owner?: { username?: string };
}

type PinterestImageSizeMap = Record<
  string,
  { url?: string; width?: number; height?: number }
>;

interface PinterestPinRecord {
  id?: string;
  title?: string;
  description?: string;
  alt_text?: string;
  link?: string;
  media?: {
    media_type?: string;
    images?: PinterestImageSizeMap;
    items?: Array<{ images?: PinterestImageSizeMap }>;
  };
}

interface PinterestPaginated<T> {
  items?: T[];
  bookmark?: string | null;
}

const DEFAULT_API_BASE = "https://api.pinterest.com/v5";
const MAX_API_PINS = 50;

export function getPinterestAccessToken(): string | undefined {
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  return token || undefined;
}

export function getPinterestApiBase(): string {
  const base = process.env.PINTEREST_API_BASE?.trim();
  if (!base) return DEFAULT_API_BASE;
  return base.replace(/\/$/, "");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parsePinterestBoardPath(rawUrl: string): PinterestBoardPath | null {
  const parsed = parsePinterestBoardUrl(rawUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length < 2) return null;

  const reserved = new Set([
    "pin",
    "search",
    "ideas",
    "today",
    "shopping",
    "videos",
    "login",
    "business",
    "settings",
    "about",
  ]);
  if (reserved.has(segments[0].toLowerCase())) return null;

  const username = segments[0];
  const boardSlug = segments[1];
  if (!username || !boardSlug || /^\d+$/.test(boardSlug)) return null;

  return {
    username,
    boardSlug: boardSlug.toLowerCase(),
    boardUrl: parsed.toString(),
  };
}

async function pinterestApiFetch<T>(
  path: string,
  token: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${getPinterestApiBase()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `Pinterest API returned ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

async function getTokenUsername(token: string): Promise<string | undefined> {
  const account = await pinterestApiFetch<{ username?: string }>("/user_account", token);
  return account.username?.trim() || undefined;
}

async function listAllBoards(token: string): Promise<PinterestBoardRecord[]> {
  const boards: PinterestBoardRecord[] = [];
  let bookmark: string | undefined;

  do {
    const page = await pinterestApiFetch<PinterestPaginated<PinterestBoardRecord>>(
      "/boards",
      token,
      {
        page_size: 100,
        bookmark,
        privacy: "PUBLIC",
      },
    );
    boards.push(...(page.items || []));
    bookmark = page.bookmark || undefined;
  } while (bookmark);

  return boards;
}

function boardMatchesSlug(board: PinterestBoardRecord, slug: string): boolean {
  const name = board.name?.trim() || "";
  if (!name) return false;
  const normalizedName = slugify(name);
  if (normalizedName === slug) return true;
  if (normalizedName.includes(slug) || slug.includes(normalizedName)) return true;
  return name.toLowerCase().replace(/\s+/g, "-") === slug;
}

async function resolveBoardForPath(
  token: string,
  path: PinterestBoardPath,
): Promise<PinterestBoardRecord | null> {
  const tokenUsername = (await getTokenUsername(token))?.toLowerCase();
  if (!tokenUsername || tokenUsername !== path.username.toLowerCase()) {
    return null;
  }

  const boards = await listAllBoards(token);
  return (
    boards.find(
      (board) =>
        board.owner?.username?.toLowerCase() === path.username.toLowerCase() &&
        boardMatchesSlug(board, path.boardSlug),
    ) || null
  );
}

function pickBestImageUrl(images?: PinterestImageSizeMap): string | undefined {
  if (!images) return undefined;

  const ranked = Object.values(images)
    .filter((image) => image?.url)
    .sort((a, b) => (b.width || 0) - (a.width || 0));
  return ranked[0]?.url;
}

function pickPinImageUrl(pin: PinterestPinRecord): string | undefined {
  const direct = pickBestImageUrl(pin.media?.images);
  if (direct) return direct;

  for (const item of pin.media?.items || []) {
    const fromItem = pickBestImageUrl(item.images);
    if (fromItem) return fromItem;
  }

  return undefined;
}

async function listBoardPins(
  token: string,
  boardId: string,
  maxPins = MAX_API_PINS,
): Promise<PinterestPinRecord[]> {
  const pins: PinterestPinRecord[] = [];
  let bookmark: string | undefined;

  while (pins.length < maxPins) {
    const page = await pinterestApiFetch<PinterestPaginated<PinterestPinRecord>>(
      `/boards/${boardId}/pins`,
      token,
      {
        page_size: Math.min(25, maxPins - pins.length),
        bookmark,
      },
    );
    pins.push(...(page.items || []));
    bookmark = page.bookmark || undefined;
    if (!bookmark || !page.items?.length) break;
  }

  return pins.slice(0, maxPins);
}

function mapApiPin(pin: PinterestPinRecord, boardUrl: string): PinterestPreviewPin | null {
  const src = pickPinImageUrl(pin);
  if (!src) return null;

  const alt =
    pin.alt_text?.trim() ||
    pin.description?.trim() ||
    pin.title?.trim() ||
    "Pinterest reference";

  return {
    id: pin.id || src,
    src,
    alt,
    url: pin.id ? `https://www.pinterest.com/pin/${pin.id}/` : undefined,
    sourceUrl: pin.link || boardUrl,
  };
}

export async function fetchPinterestBoardViaApi(
  rawUrl: string,
  token = getPinterestAccessToken(),
): Promise<PinterestPublicBoardPreview | null> {
  if (!token) return null;

  const path = parsePinterestBoardPath(rawUrl);
  if (!path) return null;

  const board = await resolveBoardForPath(token, path);
  if (!board?.id) return null;

  const apiPins = await listBoardPins(token, board.id);
  const pins = apiPins
    .map((pin) => mapApiPin(pin, path.boardUrl))
    .filter((pin): pin is PinterestPreviewPin => Boolean(pin));

  if (!pins.length) {
    throw new Error(
      "Pinterest API returned no image pins for that board. Confirm the board has pins and your token has boards:read and pins:read.",
    );
  }

  return {
    title: board.name?.trim() || path.boardSlug,
    url: path.boardUrl,
    pins,
    source: "pinterest_api",
    limited: false,
  };
}
