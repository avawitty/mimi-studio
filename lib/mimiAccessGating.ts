const truthy = (value: unknown) => value === "true" || value === "1";

/** When true, skip credit/plan gates so the full product can be exercised. */
export const isAccessGatingDisabled = (): boolean => {
  if (typeof process !== "undefined" && process.env?.MIMI_DISABLE_ACCESS_GATING) {
    return truthy(process.env.MIMI_DISABLE_ACCESS_GATING);
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_MIMI_DISABLE_ACCESS_GATING) {
    return truthy(import.meta.env.VITE_MIMI_DISABLE_ACCESS_GATING);
  }
  return false;
};
