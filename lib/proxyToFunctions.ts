import { getFirebaseFunctionsBaseUrl } from "./firebaseFunctionsUrl.js";

export interface FunctionsProxyResult {
  status: number;
  headers: Headers;
  text: string;
}

export const buildFunctionsApiUrl = (path: string, query?: Record<string, string>) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getFirebaseFunctionsBaseUrl()}${normalizedPath}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

export const proxyToFunctions = async (
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<FunctionsProxyResult> => {
  const { query, headers, ...requestInit } = init;
  const upstream = await fetch(buildFunctionsApiUrl(path, query), {
    ...requestInit,
    headers,
  });

  return {
    status: upstream.status,
    headers: upstream.headers,
    text: await upstream.text(),
  };
};
