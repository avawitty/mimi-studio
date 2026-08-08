/**
 * Calibration session scope and pair-capacity helpers.
 */

/** Maximum unique unordered pairs among n candidates. */
export function maxUniqueCalibrationPairs(candidateCount: number): number {
  if (candidateCount < 2) return 0;
  return (candidateCount * (candidateCount - 1)) / 2;
}

/** Cap a requested question count to the number of available unique pairs. */
export function capCalibrationTargetCount(
  candidateCount: number,
  requested: number,
): number {
  const maxPairs = maxUniqueCalibrationPairs(candidateCount);
  if (maxPairs <= 0) return 0;
  return Math.min(requested, maxPairs);
}

/**
 * Whether a stored session belongs to the requested calibration scope.
 * Global (unscoped) requests match only sessions with no project_id.
 */
export function calibrationSessionMatchesScope(
  sessionProjectId: string | null | undefined,
  queryProjectId: string | undefined,
): boolean {
  if (queryProjectId !== undefined) {
    return sessionProjectId === queryProjectId;
  }
  return sessionProjectId == null;
}
