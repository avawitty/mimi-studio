/**
 * Apify-agnostic source acquisition contract.
 * Core Residue Engine must not import apify-client.
 */

import {
  acquiredSourceSchema,
  sourceAcquisitionRequestSchema,
  sourceAcquisitionResultSchema,
  type AcquiredSource,
  type SourceAcquisitionRequest,
  type SourceAcquisitionResult,
} from "../validation";

export {
  acquiredSourceSchema,
  sourceAcquisitionRequestSchema,
  sourceAcquisitionResultSchema,
};
export type { AcquiredSource, SourceAcquisitionRequest, SourceAcquisitionResult };

export interface SourceAcquisitionProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean;
  acquire(request: SourceAcquisitionRequest): Promise<SourceAcquisitionResult>;
}

export function emptyAcquisitionResult(
  status: SourceAcquisitionResult["status"],
  warnings: string[] = [],
  failures: string[] = [],
): SourceAcquisitionResult {
  return {
    status,
    sources: [],
    providerRuns: [],
    failures,
    warnings,
  };
}
