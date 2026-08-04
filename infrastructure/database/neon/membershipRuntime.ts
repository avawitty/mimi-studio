import { MembershipReconciliationService } from "../../../application/memberships/reconcileMembership.js";
import { getNeonUnitOfWork } from "./unitOfWork.js";

export function getNeonMembershipReconciliationService(): MembershipReconciliationService {
  return new MembershipReconciliationService(getNeonUnitOfWork());
}
