/**
 * Pattern-split integrity: partitions must be non-empty, disjoint,
 * cover the source observation set exactly, and contain no duplicates.
 */

export type PatternSplitPartition = {
  name: string;
  observationIds: string[];
};

export type PatternSplitValidation =
  | { ok: true; partitions: PatternSplitPartition[] }
  | { ok: false; reason: string };

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function validatePatternSplit(
  sourceObservationIds: string[],
  partitions: PatternSplitPartition[],
): PatternSplitValidation {
  if (sourceObservationIds.length < 2) {
    return {
      ok: false,
      reason: 'Split requires at least two observations on the source pattern.',
    };
  }

  if (partitions.length < 2) {
    return {
      ok: false,
      reason: 'Split requires at least two partitions.',
    };
  }

  const sourceSet = new Set(sourceObservationIds);
  if (sourceSet.size !== sourceObservationIds.length) {
    return {
      ok: false,
      reason: 'Source observation set contains duplicate IDs.',
    };
  }

  const seen = new Set<string>();
  for (const part of partitions) {
    if (!part.observationIds.length) {
      return {
        ok: false,
        reason: `Partition "${part.name || '(unnamed)'}" is empty.`,
      };
    }
    const unique = uniqueIds(part.observationIds);
    if (unique.length !== part.observationIds.length) {
      return {
        ok: false,
        reason: `Partition "${part.name || '(unnamed)'}" lists an observation more than once.`,
      };
    }
    for (const id of unique) {
      if (!sourceSet.has(id)) {
        return {
          ok: false,
          reason: `Observation ${id} is not in the source pattern.`,
        };
      }
      if (seen.has(id)) {
        return {
          ok: false,
          reason: `Observation ${id} appears in more than one partition.`,
        };
      }
      seen.add(id);
    }
  }

  if (seen.size !== sourceSet.size) {
    return {
      ok: false,
      reason: 'Partition union does not equal the source observation set.',
    };
  }

  return { ok: true, partitions };
}
