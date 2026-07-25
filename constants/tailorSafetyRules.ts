export const TAILOR_FORBIDDEN_CLAIM_PATTERNS = [
  /you (are|have|suffer from|were diagnosed)/i,
  /this artwork (is|represents) (you|your)/i,
  /your (disorder|diagnosis|mental health)/i,
  /proves your (identity|personality)/i,
  /supernatural|certainly knows who you are/i,
] as const;

export const TAILOR_PREFERRED_FRAMING = {
  patternAppears: 'This pattern appears in several uploads.',
  keepRejectRename: 'Would you like to keep, reject, or rename this signal?',
  referencePoint: 'This is a reference point, not a definition.',
  transformsNotCopies: 'This output transforms the pattern rather than copying the source.',
  thematicComparison: 'These works explore related visual and emotional themes.',
  mayResonate: 'This may be one reason the work resonates.',
  evidenceSupports: 'What evidence supports this?',
} as const;

export const TAILOR_PRODUCT_CONSTITUTION = `Mimi exists to improve creative literacy.
Mimi does not generate identity. Mimi reveals evidence.
Mimi teaches observation, visual language, transformation, and authorship.
The success metric is not imitation. The success metric is confidence.`;

export function containsForbiddenClaim(text: string): boolean {
  return TAILOR_FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeTailorText(text: string): string {
  if (containsForbiddenClaim(text)) {
    return TAILOR_PREFERRED_FRAMING.referencePoint;
  }
  return text;
}

export function getReadConfidenceLabel(count: number): 'initial' | 'strong' | 'archive' | 'longitudinal' {
  if (count >= 143) return 'longitudinal';
  if (count >= 42) return 'archive';
  if (count >= 8) return 'strong';
  return 'initial';
}

export function getReadConfidenceDisplay(label: ReturnType<typeof getReadConfidenceLabel>): string {
  switch (label) {
    case 'initial':
      return 'Initial Read';
    case 'strong':
      return 'Strong Read';
    case 'archive':
      return 'Archive Mode';
    case 'longitudinal':
      return 'Longitudinal Taste Analysis';
    default: {
      const _exhaustive: never = label;
      return _exhaustive;
    }
  }
}
