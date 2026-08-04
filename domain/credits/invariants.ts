import {
  CreditReservationStateError,
  InsufficientCreditsError,
} from "./errors.js";
import type { CreditReservation } from "./types.js";

export interface BalanceProjection {
  available: bigint;
  reserved: bigint;
}

export function reserveBalance(
  projection: BalanceProjection,
  input: {
    amount: bigint;
    operationId: string;
  },
): BalanceProjection {
  if (input.amount <= 0n) {
    throw new Error("Credit reservations must be positive.");
  }
  if (projection.available < input.amount) {
    throw new InsufficientCreditsError({
      required: input.amount,
      available: projection.available,
      operationId: input.operationId,
    });
  }
  return {
    available: projection.available - input.amount,
    reserved: projection.reserved + input.amount,
  };
}

export function commitBalance(
  projection: BalanceProjection,
  reservation: Pick<
    CreditReservation,
    "id" | "status" | "estimatedAmount"
  >,
  input: { actual: bigint; maximum: bigint },
): BalanceProjection & { released: bigint } {
  if (reservation.status !== "active") {
    throw new CreditReservationStateError(
      reservation.id,
      `Reservation is already ${reservation.status}.`,
    );
  }
  if (input.actual < 0n) throw new Error("Actual credits cannot be negative.");
  if (input.actual > input.maximum) {
    throw new Error("Actual credit charge exceeds the operation policy maximum.");
  }
  if (input.actual > reservation.estimatedAmount) {
    throw new Error("Actual charge exceeds the reserved amount.");
  }
  if (projection.reserved < reservation.estimatedAmount) {
    throw new Error("Reserved credit projection is inconsistent.");
  }
  const released = reservation.estimatedAmount - input.actual;
  return {
    available: projection.available + released,
    reserved: projection.reserved - reservation.estimatedAmount,
    released,
  };
}

export function releaseBalance(
  projection: BalanceProjection,
  reservation: Pick<
    CreditReservation,
    "id" | "status" | "estimatedAmount"
  >,
): BalanceProjection {
  if (reservation.status === "committed") {
    throw new CreditReservationStateError(
      reservation.id,
      "A committed reservation cannot be released.",
    );
  }
  if (reservation.status === "released" || reservation.status === "expired") {
    return projection;
  }
  if (projection.reserved < reservation.estimatedAmount) {
    throw new Error("Reserved credit projection is inconsistent.");
  }
  return {
    available: projection.available + reservation.estimatedAmount,
    reserved: projection.reserved - reservation.estimatedAmount,
  };
}

export function allocateGrantConsumption(
  remainingAmounts: bigint[],
  charge: bigint,
): { allocations: bigint[]; unallocated: bigint } {
  let unallocated = charge;
  const allocations = remainingAmounts.map((remaining) => {
    if (unallocated <= 0n) return 0n;
    const amount = remaining < unallocated ? remaining : unallocated;
    unallocated -= amount;
    return amount;
  });
  return { allocations, unallocated };
}
