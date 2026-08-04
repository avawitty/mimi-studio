import type {
  GatewayErrorCode,
} from "../../domain/ai/types.js";
import type { GatewayTextRole } from "../../lib/ai/generate.js";

export interface ModelTarget {
  modelAlias: GatewayTextRole;
}

export interface RoutingPolicy {
  id: string;
  primary: ModelTarget;
  fallbacks: ModelTarget[];
  maxAttempts: number;
  retryableErrors: GatewayErrorCode[];
  budgetClass: "economy" | "standard" | "premium";
}

const routingPolicies: Record<string, RoutingPolicy> = {
  "structured-standard": {
    id: "structured-standard",
    primary: { modelAlias: "textDeep" },
    fallbacks: [{ modelAlias: "textFast" }],
    maxAttempts: 2,
    retryableErrors: [
      "RATE_LIMITED",
      "PROVIDER_UNAVAILABLE",
      "TIMEOUT",
      "INVALID_PROVIDER_OUTPUT",
    ],
    budgetClass: "standard",
  },
};

export function routingPolicyFor(policyId: string): RoutingPolicy {
  const policy = routingPolicies[policyId];
  if (!policy) throw new Error(`Routing policy ${policyId} is not registered.`);
  return policy;
}
