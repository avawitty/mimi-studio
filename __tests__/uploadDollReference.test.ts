import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDataUrl,
  uploadDollReferenceBatch,
  uploadDollReferenceDataUrl,
} from "../lib/doll/uploadDollReference";

const uploadBase64Image = vi.fn();

vi.mock("../services/firebaseUtils", () => ({
  uploadBase64Image: (...args: unknown[]) => uploadBase64Image(...args),
}));

describe("uploadDollReference", () => {
  beforeEach(() => {
    uploadBase64Image.mockReset();
    uploadBase64Image.mockResolvedValue("https://cdn.example.test/uploaded.jpg");
  });

  it("uploads data URLs and returns remote URLs", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    expect(isDataUrl(dataUrl)).toBe(true);
    const url = await uploadDollReferenceDataUrl("user-1", dataUrl, "creator-photo");
    expect(uploadBase64Image).toHaveBeenCalledOnce();
    expect(url).toBe("https://cdn.example.test/uploaded.jpg");
  });

  it("passes through existing remote URLs", async () => {
    const remote = "https://cdn.example.test/existing.jpg";
    const url = await uploadDollReferenceDataUrl("user-1", remote, "creator-photo");
    expect(uploadBase64Image).not.toHaveBeenCalled();
    expect(url).toBe(remote);
  });

  it("uploads aesthetic reference batches", async () => {
    const urls = await uploadDollReferenceBatch(
      "user-1",
      ["data:image/png;base64,one", "data:image/png;base64,two"],
      "aesthetic-ref",
    );
    expect(uploadBase64Image).toHaveBeenCalledTimes(2);
    expect(urls).toHaveLength(2);
  });
});
