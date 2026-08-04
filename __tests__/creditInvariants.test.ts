/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  allocateGrantConsumption,
  commitBalance,
  releaseBalance,
  reserveBalance,
} from "../domain/credits/invariants.js";
import {
  CreditReservationStateError,
  InsufficientCreditsError,
} from "../domain/credits/errors.js";

const reservation = (
  status: "active" | "committed" | "released" | "expired",
  estimatedAmount = 8n,
) => ({
  id: "20ef0f1b-4b0c-4830-aaf6-ff726824ffab",
  status,
  estimatedAmount,
});

describe("credit reservation invariants", () => {
  it("prevents concurrent reservations from overspending one projection", () => {
    const first = reserveBalance(
      { available: 10n, reserved: 0n },
      { amount: 8n, operationId: "scribe.propose-atoms" },
    );
    expect(first).toEqual({ available: 2n, reserved: 8n });
    expect(() =>
      reserveBalance(first, {
        amount: 3n,
        operationId: "scribe.propose-atoms",
      }),
    ).toThrow(InsufficientCreditsError);
  });

  it("commits once and returns unused reserved value", () => {
    expect(
      commitBalance(
        { available: 2n, reserved: 8n },
        reservation("active"),
        { actual: 5n, maximum: 8n },
      ),
    ).toEqual({ available: 5n, reserved: 0n, released: 3n });
    expect(() =>
      commitBalance(
        { available: 2n, reserved: 8n },
        reservation("released"),
        { actual: 5n, maximum: 8n },
      ),
    ).toThrow(CreditReservationStateError);
  });

  it("rejects release after commit and makes repeated release harmless", () => {
    expect(() =>
      releaseBalance(
        { available: 2n, reserved: 8n },
        reservation("committed"),
      ),
    ).toThrow(CreditReservationStateError);
    expect(
      releaseBalance(
        { available: 10n, reserved: 0n },
        reservation("released"),
      ),
    ).toEqual({ available: 10n, reserved: 0n });
  });

  it("consumes expiring grant buckets in repository order", () => {
    expect(allocateGrantConsumption([2n, 5n, 10n], 6n)).toEqual({
      allocations: [2n, 4n, 0n],
      unallocated: 0n,
    });
    expect(allocateGrantConsumption([2n], 3n).unallocated).toBe(1n);
  });
});
