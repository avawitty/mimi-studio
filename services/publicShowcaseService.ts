import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebaseInit";
import type { PublicShowcaseSnapshot, UserProfile, ZineMetadata } from "../types";
import { getUserByHandle } from "./firebaseUtils";

export const fetchPublicZinesForUser = async (uid: string): Promise<ZineMetadata[]> => {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, "zines"),
      where("userId", "==", uid),
      where("isPublic", "==", true),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => docSnap.data() as ZineMetadata)
      .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
  } catch (error) {
    console.warn("MIMI // fetchPublicZinesForUser failed:", error);
    return [];
  }
};

export const fetchFeaturedPublicZines = async (count = 24): Promise<ZineMetadata[]> => {
  try {
    const q = query(collection(db, "zines"), where("isPublic", "==", true), limit(Math.min(count * 3, 60)));
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => docSnap.data() as ZineMetadata)
      .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0))
      .slice(0, count);
  } catch (error) {
    // Re-throw so callers can distinguish a failed query from a real empty archive.
    console.warn("MIMI // fetchFeaturedPublicZines failed:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to load featured public zines");
  }
};

export interface PublicProfileShowcase {
  profile: UserProfile;
  showcase: PublicShowcaseSnapshot | null;
  zines: ZineMetadata[];
}

export const loadPublicProfileShowcase = async (
  handle: string,
): Promise<PublicProfileShowcase | null> => {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;

  const profile = await getUserByHandle(normalized);
  if (!profile?.uid) return null;

  const zines = await fetchPublicZinesForUser(profile.uid);
  const showcase = profile.publicShowcase ?? null;

  return {
    profile: { ...profile, handle: profile.handle || normalized },
    showcase,
    zines,
  };
};
