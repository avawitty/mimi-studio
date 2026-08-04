import { CreditService } from "../../../application/credits/creditService.js";
import { CreditMaintenanceService } from "../../../application/credits/maintenance.js";
import { getNeonUnitOfWork } from "./unitOfWork.js";

export function getNeonCreditService(): CreditService {
  return new CreditService(getNeonUnitOfWork());
}

export function getNeonCreditMaintenanceService(): CreditMaintenanceService {
  return new CreditMaintenanceService(getNeonUnitOfWork());
}
