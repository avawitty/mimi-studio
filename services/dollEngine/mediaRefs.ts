import type { Doll } from "../../types";
import type { DollIdentityView, DollImageReference } from "./types";
import { collectIdentityImageReferences } from "./identityPack";

export function resolveIdentityViewUrl(
  doll: Doll,
  view: DollIdentityView = "portrait",
): string | undefined {
  const pack = doll.identityReferences;
  if (view === "portrait") return pack?.portraitUrl || doll.generatedImageUrl;
  if (view === "full_body") return pack?.fullBodyUrl;
  return pack?.profileUrl;
}

async function urlToBase64DataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Fetch calibrated doll identity URLs into MediaFile-shaped entries for multimodal generation. */
export async function fetchDollImageReferencesAsMedia(
  refs: DollImageReference[],
): Promise<
  Array<{
    type: "image";
    url: string;
    data: string;
    mimeType: string;
    name: string;
    tags: string[];
  }>
> {
  const out: Array<{
    type: "image";
    url: string;
    data: string;
    mimeType: string;
    name: string;
    tags: string[];
  }> = [];

  for (const ref of refs.slice(0, 3)) {
    const dataUrl = await urlToBase64DataUrl(ref.url);
    if (!dataUrl) continue;
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    out.push({
      type: "image",
      url: ref.url,
      data: dataUrl,
      mimeType: mimeMatch?.[1] || "image/png",
      name: ref.name,
      tags: ref.tags,
    });
  }

  return out;
}

export async function fetchDollIdentityMedia(
  doll: Doll,
): Promise<
  Array<{
    type: "image";
    url: string;
    data: string;
    mimeType: string;
    name: string;
    tags: string[];
  }>
> {
  return fetchDollImageReferencesAsMedia(collectIdentityImageReferences(doll));
}
