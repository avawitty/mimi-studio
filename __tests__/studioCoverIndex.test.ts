import { describe, expect, it, beforeEach } from "vitest";
import {
  allocateCoverIssueIndex,
  coverSystemCodeFromIndex,
  formatCoverIndex,
  getOrAllocateCoverIssueIndex,
  isLegacyDefaultCoverCode,
  parseCoverIndexFromCode,
  resolveCoverSystemCodeForSession,
  startNewCoverIssue,
  COVER_ISSUE_COUNTER_KEY,
  COVER_ISSUE_SESSION_KEY,
} from "../lib/studioCoverIndex";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("studioCoverIndex", () => {
  let local: Storage;
  let session: Storage;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
  });

  it("formats cover indices with zero padding", () => {
    expect(formatCoverIndex(1)).toBe("001");
    expect(formatCoverIndex(7)).toBe("007");
    expect(formatCoverIndex(128)).toBe("128");
  });

  it("builds registry codes from index", () => {
    expect(coverSystemCodeFromIndex(7)).toBe("SYS // COV-007");
  });

  it("allocates monotonic issue numbers", () => {
    expect(allocateCoverIssueIndex(local)).toBe(1);
    expect(allocateCoverIssueIndex(local)).toBe(2);
    expect(local.getItem(COVER_ISSUE_COUNTER_KEY)).toBe("2");
  });

  it("reuses session index until a new issue is started", () => {
    expect(getOrAllocateCoverIssueIndex(local, session)).toBe(1);
    expect(getOrAllocateCoverIssueIndex(local, session)).toBe(1);
    expect(startNewCoverIssue(local, session)).toBe(2);
    expect(getOrAllocateCoverIssueIndex(local, session)).toBe(2);
    expect(session.getItem(COVER_ISSUE_SESSION_KEY)).toBe("2");
  });

  it("detects legacy default codes and parses indexed codes", () => {
    expect(isLegacyDefaultCoverCode("SYS // COV-INT.1")).toBe(true);
    expect(isLegacyDefaultCoverCode("SYS // COV-007")).toBe(false);
    expect(parseCoverIndexFromCode("SYS // COV-007")).toBe(7);
  });

  it("derives fresh cover code when stored index does not match session", () => {
    expect(
      resolveCoverSystemCodeForSession(2, "SYS // COV-001"),
    ).toBe("SYS // COV-002");
    expect(
      resolveCoverSystemCodeForSession(2, "SYS // COV-002"),
    ).toBe("SYS // COV-002");
  });
});
