/**
 * Lazy apify-client bootstrap for Residue acquisition.
 * Engine core must not import this — only the Apify provider adapter.
 */

import { ApifyClient } from "apify-client";

export type ResidueApifyActorCallResult = {
  id?: string;
  status?: string;
  defaultDatasetId?: string;
};

export type ResidueApifyClient = {
  actor(actorId: string): {
    call(
      input: Record<string, unknown>,
      options?: { waitSecs?: number },
    ): Promise<ResidueApifyActorCallResult>;
  };
  dataset(datasetId: string): {
    listItems(options?: { limit?: number }): Promise<{ items: unknown[] }>;
  };
};

let cache: { token: string; client: ResidueApifyClient } | null = null;

export function readApifyToken(
  explicit?: string,
  env: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {},
): string | undefined {
  const token = (explicit ?? env.APIFY_TOKEN)?.trim();
  return token || undefined;
}

export function getResidueApifyClient(token: string): ResidueApifyClient {
  if (cache?.token === token) return cache.client;
  const client = new ApifyClient({ token }) as unknown as ResidueApifyClient;
  cache = { token, client };
  return client;
}

/** Test helper — clear cached client between verify runs. */
export function resetResidueApifyClientCache(): void {
  cache = null;
}
