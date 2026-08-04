import { ApproveMemoryProposalsService } from "../../../application/memory/approveProposals.js";
import { getNeonUnitOfWork } from "./unitOfWork.js";

export function getNeonMemoryApprovalService(): ApproveMemoryProposalsService {
  return new ApproveMemoryProposalsService(getNeonUnitOfWork());
}

export function getNeonMemoryRepositories() {
  return getNeonUnitOfWork().repositories.memory;
}
