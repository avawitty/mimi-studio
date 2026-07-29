/**
 * studioAlert — typed wrapper around the mimi:registry_alert custom event.
 *
 * Centralises the error-state dispatch pattern so callers don't repeat the
 * `window.dispatchEvent(new CustomEvent("mimi:registry_alert", ...))` boilerplate
 * and so the event schema has a single authoritative definition.
 */

export interface StudioAlertDetail {
  message: string;
  /** Visual severity hint consumed by RegistryAlert. Defaults to neutral. */
  type?: "success" | "error" | "info" | "warning";
  /** Optional icon rendered inline — pass a JSX element from the caller. */
  icon?: unknown;
}

/**
 * Fire a mimi:registry_alert event visible to the RegistryAlert toast component.
 *
 * @example
 * dispatchStudioAlert({ message: "Saved.", type: "success" });
 * dispatchStudioAlert({ message: "Failed.", type: "error", icon: <AlertCircle size={14} /> });
 */
export function dispatchStudioAlert(detail: StudioAlertDetail): void {
  window.dispatchEvent(new CustomEvent("mimi:registry_alert", { detail }));
}
