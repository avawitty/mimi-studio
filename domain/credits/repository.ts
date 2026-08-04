import type {
  CommitReservationInput,
  CreateReservationInput,
  CreditAccount,
  CreditAccountOwner,
  CreditBalance,
  CreditLedgerEntry,
  CreditReservation,
  IssueCreditGrantInput,
  ReleaseReservationInput,
} from "./types.js";

/**
 * Storage-neutral credit boundary. Every mutating method is expected to run
 * inside a UnitOfWork transaction supplied by the infrastructure adapter.
 */
export interface CreditLedgerRepository {
  findAccount(owner: CreditAccountOwner): Promise<CreditAccount | null>;
  getOrCreateAccount(owner: CreditAccountOwner): Promise<CreditAccount>;
  issueGrant(input: IssueCreditGrantInput): Promise<CreditLedgerEntry>;
  expireEligibleGrants(accountId: string, now?: Date): Promise<bigint>;
  createReservation(input: CreateReservationInput): Promise<CreditReservation>;
  commitReservation(input: CommitReservationInput): Promise<CreditLedgerEntry[]>;
  releaseReservation(input: ReleaseReservationInput): Promise<void>;
  getReservation(reservationId: string): Promise<CreditReservation | null>;
  listExpiredActiveReservations(
    now: Date,
    limit: number,
  ): Promise<CreditReservation[]>;
  deferReservationReview(
    reservationId: string,
    reviewAfter: Date,
  ): Promise<void>;
  getBalance(accountId: string): Promise<CreditBalance>;
}
