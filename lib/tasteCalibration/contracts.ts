import { z } from 'zod';
import type { TasteContextScope } from '../tasteModel/contracts';

// ─── Calibration choices ──────────────────────────────────────────────────────

export const CALIBRATION_CHOICES = [
  'left',
  'right',
  'both',
  'neither',
  'skip',
] as const;

export type CalibrationChoice = (typeof CALIBRATION_CHOICES)[number];

export const calibrationChoiceSchema = z.enum(CALIBRATION_CHOICES);

// ─── Selection reason ───────────────────────────────────────────────────────────

export const calibrationSelectionReasonSchema = z.object({
  primaryFeatureIds: z.array(z.string()),
  primaryFeatureLabels: z.array(z.string()),
  uncertaintyScore: z.number(),
  featureDisagreementScore: z.number(),
  coverageGapScore: z.number(),
  explanation: z.string(),
  algorithmVersion: z.string(),
});

export type CalibrationSelectionReason = z.infer<
  typeof calibrationSelectionReasonSchema
>;

// ─── Session status ─────────────────────────────────────────────────────────────

export const CALIBRATION_SESSION_STATUSES = [
  'active',
  'paused',
  'completed',
  'abandoned',
] as const;

export type CalibrationSessionStatus =
  (typeof CALIBRATION_SESSION_STATUSES)[number];

// ─── Pair / judgment records ────────────────────────────────────────────────────

export const tasteCalibrationPairSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  pairIndex: z.number().int().nonnegative(),
  leftCandidateId: z.string(),
  rightCandidateId: z.string(),
  isolatedFeatureIds: z.array(z.string()),
  selectionReason: calibrationSelectionReasonSchema,
  predictedLeftPreference: z.number().min(0).max(1),
  expectedInformationGain: z.number(),
  askedAt: z.number(),
  answeredAt: z.number().optional(),
});

export type TasteCalibrationPair = z.infer<typeof tasteCalibrationPairSchema>;

export const tastePairwiseJudgmentSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  pairId: z.string().uuid(),
  choice: calibrationChoiceSchema,
  decidingFeatureIds: z.array(z.string()),
  correctionNote: z.string().optional(),
  scope: z.enum(['persistent', 'project', 'session']),
  projectId: z.string().optional(),
  answeredAt: z.number(),
});

export type TastePairwiseJudgment = z.infer<typeof tastePairwiseJudgmentSchema>;

export const tasteCalibrationSessionSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().optional(),
  status: z.enum(CALIBRATION_SESSION_STATUSES),
  targetQuestionCount: z.number().int().positive(),
  answeredCount: z.number().int().nonnegative(),
  seed: z.string(),
  algorithmVersion: z.string(),
  baselineSnapshotId: z.string().optional(),
  currentSnapshotId: z.string().optional(),
  scope: z.enum(['persistent', 'project', 'session']),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
});

export type TasteCalibrationSession = z.infer<
  typeof tasteCalibrationSessionSchema
>;

// ─── Model delta ────────────────────────────────────────────────────────────────

export interface TasteModelDelta {
  previousSnapshotId?: string;
  nextSnapshotId: string;
  changedFeatures: Array<{
    featureId: string;
    label: string;
    previousWeight: number;
    nextWeight: number;
    delta: number;
    previousConfidence: number;
    nextConfidence: number;
  }>;
  changedRules: Array<{
    ruleId: string;
    previousWeight?: number;
    nextWeight: number;
  }>;
  remainingUncertaintyFeatureIds: string[];
}

// ─── API payloads ───────────────────────────────────────────────────────────────

export const createCalibrationSessionBodySchema = z.object({
  projectId: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
  targetQuestionCount: z.number().int().min(1).max(30).optional(),
  scope: z.enum(['persistent', 'project', 'session']).optional(),
  seed: z.string().optional(),
});

export const submitCalibrationJudgmentBodySchema = z.object({
  sessionId: z.string().uuid(),
  pairId: z.string().uuid(),
  choice: calibrationChoiceSchema,
  decidingFeatureIds: z.array(z.string()).optional(),
  correctionNote: z.string().max(500).optional(),
});

export const completeCalibrationSessionBodySchema = z.object({
  sessionId: z.string().uuid(),
});

// ─── Candidate representation for pair selection ────────────────────────────────

export interface CalibrationCandidate {
  id: string;
  label: string;
  imageUrl?: string;
  altText?: string;
  featureIds: string[];
  featureLabels: Record<string, string>;
  tags: string[];
}

export interface CalibrationPairCandidateView {
  id: string;
  label: string;
  imageUrl?: string;
  altText?: string;
  featureIds: string[];
  featureLabels: Record<string, string>;
}

export interface CalibrationPairResponse {
  pair: TasteCalibrationPair;
  left: CalibrationPairCandidateView;
  right: CalibrationPairCandidateView;
  sessionProgress: {
    answered: number;
    target: number;
    remaining: number;
  };
}

export interface CalibrationJudgmentResponse {
  judgment: TastePairwiseJudgment;
  modelDelta: TasteModelDelta;
  session: TasteCalibrationSession;
  nextPair?: CalibrationPairResponse;
  sessionComplete: boolean;
}

export interface CalibrationSessionSummary {
  session: TasteCalibrationSession;
  strongestConfirmed: Array<{ featureId: string; label: string; weight: number }>;
  strongestRefusals: Array<{ featureId: string; label: string; weight: number }>;
  remainingUncertainties: Array<{ featureId: string; label: string }>;
  sessionModelDelta?: TasteModelDelta;
}

export type CalibrationScope = TasteContextScope;
