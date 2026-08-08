import { getNeonUnitOfWork } from "./unitOfWork.js";

export function getNeonTasteIntelligenceRepository() {
  return getNeonUnitOfWork().repositories.tasteIntelligence;
}
