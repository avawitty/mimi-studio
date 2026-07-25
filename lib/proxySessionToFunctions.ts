import { getSessionLoginUrl, getSessionLogoutUrl } from "./firebaseFunctionsUrl.js";

/** Strip Domain= so proxied Set-Cookie applies to the Vercel host, not cloudfunctions.net. */
export const normalizeProxiedSetCookie = (setCookie: string | null): string | undefined => {
  if (!setCookie) return undefined;
  return setCookie.replace(/;\s*Domain=[^;]*/gi, "");
};

export const proxySessionLogin = async (body: { idToken?: string }) => {
  const upstream = await fetch(getSessionLoginUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { error: text || "Session login proxy failed." };
  }

  return {
    status: upstream.status,
    setCookie: normalizeProxiedSetCookie(upstream.headers.get("set-cookie")),
    payload,
  };
};

export const proxySessionLogout = async () => {
  const upstream = await fetch(getSessionLogoutUrl(), { method: "POST" });
  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { status: "success" };
  }

  return {
    status: upstream.status,
    setCookie: normalizeProxiedSetCookie(upstream.headers.get("set-cookie")),
    payload,
  };
};
