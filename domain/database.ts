import type { CreditLedgerRepository } from "./credits/repository.js";
import type {
  MembershipRepository,
  StripeEventRepository,
} from "./memberships/repository.js";
import type {
  MemoryRepository,
  ProvenanceRepository,
} from "./memory/repository.js";
import type { TasteCalibrationRepository } from "./tasteCalibration/repository.js";
import type {
  AiRunRepository,
  OperationResultRepository,
  WorkflowRepository,
} from "./workflows/repository.js";

export interface DatabaseRepositories {
  credits: CreditLedgerRepository;
  memberships: MembershipRepository;
  stripeEvents: StripeEventRepository;
  workflows: WorkflowRepository;
  aiRuns: AiRunRepository;
  operationResults: OperationResultRepository;
  memory: MemoryRepository;
  provenance: ProvenanceRepository;
  tasteCalibration: TasteCalibrationRepository;
}

export interface UnitOfWork {
  readonly repositories: DatabaseRepositories;
  transaction<T>(
    callback: (repositories: DatabaseRepositories) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}
