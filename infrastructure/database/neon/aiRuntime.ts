import { AiOperationService } from "../../../application/operations/executeOperation.js";
import { VercelAiGateway } from "../../ai-gateway/vercelGateway.js";
import { getServerAiGatewayKey } from "../../../lib/aiGatewayCompat.js";
import { getNeonUnitOfWork } from "./unitOfWork.js";

export function getNeonAiOperationService(): AiOperationService {
  return new AiOperationService(
    getNeonUnitOfWork(),
    new VercelAiGateway(getServerAiGatewayKey() || undefined),
  );
}
