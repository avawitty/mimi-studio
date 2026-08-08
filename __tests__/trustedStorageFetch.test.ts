import { describe, expect, it } from "vitest";
import {
  assertTrustedRemoteAssetUrl,
  isPrivateHost,
  isTrustedStorageHost,
  TrustedStorageFetchError,
} from "../lib/trustedStorageFetch";

describe("trustedStorageFetch", () => {
  it("blocks private network hosts", () => {
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("10.0.0.5")).toBe(true);
    expect(isPrivateHost("localhost")).toBe(true);
  });

  it("allows Firebase storage hosts", () => {
    expect(isTrustedStorageHost("mimistudios.firebasestorage.app")).toBe(true);
    expect(isTrustedStorageHost("storage.googleapis.com")).toBe(true);
  });

  it("rejects arbitrary public URLs (SSRF guard)", () => {
    expect(() =>
      assertTrustedRemoteAssetUrl("https://example.com/secret.png"),
    ).toThrow(TrustedStorageFetchError);
  });

  it("accepts trusted HTTPS storage URLs", () => {
    const url = assertTrustedRemoteAssetUrl(
      "https://mimistudios.firebasestorage.app/v0/b/demo/o/ref.jpg",
    );
    expect(url.hostname).toContain("firebasestorage.app");
  });
});
