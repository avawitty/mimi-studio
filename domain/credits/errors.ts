export class InsufficientCreditsError extends Error {
  readonly required: bigint;
  readonly available: bigint;
  readonly operationId: string;

  constructor(input: {
    required: bigint;
    available: bigint;
    operationId: string;
  }) {
    super("The credit account does not have enough spendable credits.");
    this.name = "InsufficientCreditsError";
    this.required = input.required;
    this.available = input.available;
    this.operationId = input.operationId;
  }
}

export class CreditReservationStateError extends Error {
  readonly reservationId: string;

  constructor(reservationId: string, message: string) {
    super(message);
    this.name = "CreditReservationStateError";
    this.reservationId = reservationId;
  }
}
