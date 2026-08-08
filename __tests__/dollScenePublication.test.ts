import { describe, expect, it } from "vitest";

function fetchFriendPortraitFromShowcase(profile: {
  publicShowcase?: { dollPortraitUrl?: string };
} | null): string | null {
  return profile?.publicShowcase?.dollPortraitUrl || null;
}

describe("friend scene public doll snapshots", () => {
  it("uses only published showcase doll portrait for friend scenes", () => {
    expect(
      fetchFriendPortraitFromShowcase({
        publicShowcase: { dollPortraitUrl: "https://cdn.example.test/friend.jpg" },
      }),
    ).toBe("https://cdn.example.test/friend.jpg");
    expect(fetchFriendPortraitFromShowcase({ publicShowcase: {} })).toBeNull();
    expect(fetchFriendPortraitFromShowcase(null)).toBeNull();
  });
});

describe("doll onboarding storage contract", () => {
  it("stores remote URLs instead of inline bytes in onboarding refs", () => {
    const refs = {
      userPhotoUrl: "https://cdn.example.test/users/u1/creator-photo.jpg",
      aestheticRefUrls: [
        "https://cdn.example.test/users/u1/aesthetic-ref-1.jpg",
        "https://cdn.example.test/users/u1/aesthetic-ref-2.jpg",
      ],
    };
    expect(refs.userPhotoUrl.startsWith("https://")).toBe(true);
    expect(refs.aestheticRefUrls.every((url) => url.startsWith("https://"))).toBe(true);
    expect(JSON.stringify(refs).includes("data:image")).toBe(false);
  });
});
