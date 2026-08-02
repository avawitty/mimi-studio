/**
 * Recover from post-deploy stale chunks:
 * browser/SW still requests old /assets/*.js → server returns HTML → MIME error.
 */

const RECOVERY_KEY = "mimi_stale_chunk_recover_at";
const RECOVERY_COOLDOWN_MS = 45_000;

export function isStaleAssetError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("mime type") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    /chunkloaderror/i.test(message)
  );
}

export async function clearClientCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* ignore */
  }
}

/** Hard reload once per cooldown window to avoid infinite loops. */
export async function recoverFromStaleAsset(reason?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const last = Number(sessionStorage.getItem(RECOVERY_KEY) || "0");
    if (Date.now() - last < RECOVERY_COOLDOWN_MS) return false;
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    /* private mode — still attempt recovery */
  }

  console.warn("[Mimi] Stale asset recovery:", reason || "unknown");
  await clearClientCaches();

  const url = new URL(window.location.href);
  url.searchParams.set("recovered", "1");
  window.location.replace(url.toString());
  return true;
}

export function installStaleAssetListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    void recoverFromStaleAsset("vite:preloadError");
  });

  window.addEventListener(
    "error",
    (event) => {
      const msg =
        event.message ||
        (event.error instanceof Error ? event.error.message : "") ||
        "";
      if (isStaleAssetError(msg)) {
        event.preventDefault();
        void recoverFromStaleAsset(msg);
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : reason && typeof reason === "object" && "message" in reason
            ? String((reason as { message: unknown }).message)
            : String(reason ?? "");
    if (isStaleAssetError(msg)) {
      event.preventDefault();
      void recoverFromStaleAsset(msg);
    }
  });
}
