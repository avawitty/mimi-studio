import type { CorrectionState, UserCurationStatus } from "../../types";

export function correctionToAtomReaction(correction: CorrectionState): UserCurationStatus {
  switch (correction) {
    case "YES":
    case "MORE_LIKE_THIS":
      return "accepted";
    case "NOT_ME":
    case "NOT_ANYMORE":
      return "rejected";
    case "SORT_OF":
    case "ONLY_HERE":
      return "suggested";
  }
}

export function atomReactionToCorrection(
  reaction: UserCurationStatus,
): CorrectionState | undefined {
  switch (reaction) {
    case "accepted":
      return "YES";
    case "rejected":
      return "NOT_ME";
    case "suggested":
    case "renamed":
    case "merged":
    case "split":
    case "hidden":
      return undefined;
    default: {
      const _exhaustive: never = reaction;
      return _exhaustive;
    }
  }
}
