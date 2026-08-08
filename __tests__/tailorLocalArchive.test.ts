import { describe, expect, it } from "vitest";
import { isFirestoreQuotaError } from "../services/firebaseUtils";

describe("isFirestoreQuotaError", () => {
  it("detects resource-exhausted code", () => {
    expect(isFirestoreQuotaError({ code: "resource-exhausted" })).toBe(true);
  });

  it("detects Quota limit exceeded message", () => {
    expect(
      isFirestoreQuotaError(
        new Error(
          "Quota limit exceeded. Retry after quota limits are reset or enable billing",
        ),
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isFirestoreQuotaError(new Error("permission-denied"))).toBe(false);
  });
});
