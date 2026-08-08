import type { DollDeclaredAttributes, DollLikenessTraits } from '../types';

function splitMarks(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge user-written attributes with model-extracted likeness traits (user wins on conflicts). */
export function mergeLikenessTraits(
  declared?: DollDeclaredAttributes,
  extracted?: DollLikenessTraits,
): DollLikenessTraits | undefined {
  const declaredMarks = splitMarks(declared?.distinguishingMarks);
  const extractedMarks = extracted?.distinguishingMarks ?? [];
  const distinguishingMarks = [...declaredMarks, ...extractedMarks].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );

  const merged: DollLikenessTraits = {
    hairDescription: declared?.hair?.trim() || extracted?.hairDescription,
    eyeColor: declared?.eyes?.trim() || extracted?.eyeColor,
    faceShape: declared?.faceFeatures?.trim() || extracted?.faceShape,
    distinguishingMarks: distinguishingMarks.length ? distinguishingMarks : undefined,
    resinSkinTone: declared?.skinTone?.trim() || extracted?.resinSkinTone,
    expressionBaseline: declared?.expression?.trim() || extracted?.expressionBaseline,
    styleNotes: declared?.styleNotes?.trim() || extracted?.styleNotes,
    userNotes: declared?.otherNotes?.trim() || extracted?.userNotes,
  };

  const hasValue = Object.values(merged).some((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  );
  return hasValue ? merged : undefined;
}

export function formatDeclaredAttributesForPrompt(declared?: DollDeclaredAttributes): string {
  if (!declared) return '';
  const lines = [
    declared.hair?.trim() ? `Hair: ${declared.hair.trim()}` : '',
    declared.eyes?.trim() ? `Eyes: ${declared.eyes.trim()}` : '',
    declared.faceFeatures?.trim() ? `Face & features: ${declared.faceFeatures.trim()}` : '',
    declared.distinguishingMarks?.trim()
      ? `Marks & signatures: ${declared.distinguishingMarks.trim()}`
      : '',
    declared.skinTone?.trim() ? `Resin skin tone: ${declared.skinTone.trim()}` : '',
    declared.expression?.trim() ? `Expression: ${declared.expression.trim()}` : '',
    declared.styleNotes?.trim() ? `Style / wardrobe: ${declared.styleNotes.trim()}` : '',
    declared.otherNotes?.trim() ? `Other: ${declared.otherNotes.trim()}` : '',
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : '';
}
