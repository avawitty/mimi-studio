/**
 * Omni Loop time-travel scenes — map raw thoughts onto public-domain art via Imagen.
 */
import type { ArtworkMatch, Doll, DollScene } from '../types';
import {
  getDoll,
  listDolls,
  saveDollScene,
  updateDollScene,
  getDollScene,
} from './tailorService';
import { generateRedepictionPrompt } from './tailorAnalysisService';
import {
  buildMimiShellImagePrompt,
  OMNI_LOOP_CULT,
  resolveIdentityViewUrl,
} from './dollEngine';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseInit';

export interface TimeTravelSceneInput {
  userId: string;
  dollId: string;
  projectId?: string;
  rawThought: string;
  artwork: Pick<
    ArtworkMatch,
    | 'artworkTitle'
    | 'artist'
    | 'imageUrl'
    | 'sourceUrl'
    | 'publicDomainStatus'
    | 'matchedThemes'
  > & { date?: string };
  eraLabel?: string;
  friendUserIds?: string[];
  visibility?: 'private' | 'public';
}

async function fetchFriendPortraitUrl(friendUserId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles_public', friendUserId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return (data?.dollPortraitUrl as string) || null;
  } catch {
    return null;
  }
}

function buildFallbackScenePrompt(
  doll: Doll,
  input: TimeTravelSceneInput,
): { prompt: string; citation: string; transformationNotes: string } {
  const artwork = input.artwork;
  const scenario = `Reinterpret "${artwork.artworkTitle}" by ${artwork.artist} through Omni Loop Cult dolls. Creator thought: ${input.rawThought.trim()}. Era: ${input.eraLabel || artwork.date || 'historical'}. Themes: ${(artwork.matchedThemes || []).join(', ')}. Transformative homage — not a copy. Doll(s) wear ${OMNI_LOOP_CULT.wardrobe}. Cult mind collective gaze.`;
  const shellPrompt = buildMimiShellImagePrompt(doll, {
    view: 'full_body',
    scenario,
    posture: 'composed cult calm, chin slightly lifted, superintelligent stillness',
  });
  return {
    prompt: shellPrompt,
    citation: `${artwork.artworkTitle}, ${artwork.artist}`,
    transformationNotes:
      'Transformative reinterpretation through Omni Loop BJD dolls — composition and palette echo the historical reference without direct reproduction.',
  };
}

export async function generateTimeTravelScene(input: TimeTravelSceneInput): Promise<DollScene> {
  const doll = await getDoll(input.userId, input.dollId);
  if (!doll) throw new Error('Doll not found');

  const thought = input.rawThought?.trim();
  if (!thought) throw new Error('Leave a raw thought to map onto history.');

  const artworkMatch: ArtworkMatch = {
    id: 'pending',
    userId: input.userId,
    projectId: input.projectId,
    artworkTitle: input.artwork.artworkTitle,
    artist: input.artwork.artist,
    date: input.artwork.date,
    imageUrl: input.artwork.imageUrl,
    sourceUrl: input.artwork.sourceUrl,
    publicDomainStatus: input.artwork.publicDomainStatus,
    matchedThemes: input.artwork.matchedThemes ?? [],
    matchedVisualSignals: [],
    differences: [],
    educationalSummary: '',
    linkedPatternClusterIds: [],
    linkedCreativeLawIds: [],
    createdAt: Date.now(),
  };

  let promptResult: { prompt: string; citation: string; transformationNotes: string };
  if (input.projectId) {
    try {
      promptResult = await generateRedepictionPrompt(
        input.userId,
        input.projectId,
        input.dollId,
        artworkMatch,
        `Omni Loop time travel: ${thought}`,
      );
      promptResult.prompt = `${promptResult.prompt}\n\nOmni Loop Cult dolls (${OMNI_LOOP_CULT.thesis}): ${buildMimiShellImagePrompt(doll, { view: 'full_body' }).slice(0, 400)}`;
    } catch {
      promptResult = buildFallbackScenePrompt(doll, input);
    }
  } else {
    promptResult = buildFallbackScenePrompt(doll, input);
  }

  const references: Array<{ name: string; description: string; url: string; tags: string[] }> = [];

  const portraitUrl = resolveIdentityViewUrl(doll, 'portrait');
  if (portraitUrl) {
    references.push({
      name: 'Primary Omni Loop doll',
      description: `Identity lock for ${doll.name}`,
      url: portraitUrl,
      tags: ['doll', 'portrait', 'identity-lock'],
    });
  }

  if (input.artwork.imageUrl) {
    references.push({
      name: 'Historical reference',
      description: `${input.artwork.artworkTitle} by ${input.artwork.artist} — composition echo only`,
      url: input.artwork.imageUrl,
      tags: ['art-history', 'reference', 'public-domain'],
    });
  }

  const friendIds = input.friendUserIds ?? [];
  for (const friendId of friendIds.slice(0, 3)) {
    const friendPortrait = await fetchFriendPortraitUrl(friendId);
    if (friendPortrait) {
      references.push({
        name: 'Companion doll',
        description: 'Friend Omni Loop doll in scene',
        url: friendPortrait,
        tags: ['doll', 'friend', 'companion'],
      });
    }
  }

  const imageResponse = await fetch('/api/mimi-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptResult.prompt,
      aspectRatio: '16:9',
      allowFaces: true,
      references: references.length ? references : undefined,
      metadata: { source: 'omni-loop-time-travel', dollId: input.dollId },
    }),
  });

  const imageData = await imageResponse.json();
  if (!imageResponse.ok) {
    throw new Error(imageData?.error?.message || `Image route ${imageResponse.status}`);
  }
  if (imageData?.provider === 'simulated' || imageData?.metadata?.noKeyPreview) {
    throw new Error(imageData?.warnings?.[0] || 'Image provider returned simulated plate');
  }

  const scene = await saveDollScene(input.userId, {
    dollId: input.dollId,
    projectId: input.projectId,
    rawThought: thought,
    artworkTitle: input.artwork.artworkTitle,
    artist: input.artwork.artist,
    artworkImageUrl: input.artwork.imageUrl,
    artworkSourceUrl: input.artwork.sourceUrl,
    publicDomainStatus: input.artwork.publicDomainStatus,
    eraLabel: input.eraLabel,
    sceneImageUrl: imageData?.imageUrl,
    generationPrompt: promptResult.prompt,
    citation: promptResult.citation,
    transformationNotes: promptResult.transformationNotes,
    friendUserIds: friendIds,
    visibility: input.visibility ?? 'private',
  });

  return scene;
}

export async function publishDollScene(userId: string, sceneId: string): Promise<DollScene | null> {
  await updateDollScene(userId, sceneId, { visibility: 'public' });
  return getDollScene(userId, sceneId);
}

export async function listFriendDollsForScene(userId: string): Promise<
  Array<{ userId: string; handle: string; dollPortraitUrl?: string; dollLabel?: string }>
> {
  const { fetchFriends } = await import('./connections');
  const friendships = await fetchFriends(userId);
  const results: Array<{ userId: string; handle: string; dollPortraitUrl?: string; dollLabel?: string }> = [];

  for (const f of friendships.slice(0, 20)) {
    const friendId = f.friendId;
    try {
      const profileSnap = await getDoc(doc(db, 'profiles_public', friendId));
      const profile = profileSnap.exists() ? profileSnap.data() : null;
      const dolls = await listDolls(friendId);
      const portrait =
        profile?.dollPortraitUrl ||
        dolls[0]?.identityReferences?.portraitUrl ||
        dolls[0]?.generatedImageUrl;
      results.push({
        userId: friendId,
        handle: String(profile?.handle || friendId.slice(0, 8)),
        dollPortraitUrl: portrait,
        dollLabel: String(profile?.dollLabel || dolls[0]?.name || 'Friend doll'),
      });
    } catch {
      // skip inaccessible friends
    }
  }

  return results;
}
