import type { UnitOfWork } from "../../domain/database.js";
import type { WorkflowRun } from "../../domain/workflows/types.js";

export interface ReservationSweepResult {
  released: string[];
  ambiguous: string[];
}

export class CreditMaintenanceService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async recoverExpiredWorkflow(workflow: WorkflowRun): Promise<boolean> {
    return this.unitOfWork.transaction(async (repositories) => {
      const aiRun = await repositories.aiRuns.findByWorkflow(workflow.id);
      if (!aiRun) return false;
      const reservation = await repositories.credits.getReservation(
        aiRun.reservationId,
      );
      if (
        !reservation ||
        reservation.status !== "active" ||
        reservation.expiresAt > new Date()
      ) {
        return false;
      }
      if (aiRun.status === "succeeded" || aiRun.status === "awaiting_approval") {
        return false;
      }
      await repositories.credits.releaseReservation({
        reservationId: reservation.id,
        reason: "expired",
        idempotencyKey: `sweeper:${reservation.id}`,
      });
      await repositories.aiRuns.fail({
        runId: aiRun.id,
        errorCode: "TIMEOUT",
        errorMetadata: { recoveredBy: "idempotent-replay" },
      });
      await repositories.workflows.updateStatus({
        workflowRunId: workflow.id,
        status: "failed",
        currentStep: null,
        errorCode: "TIMEOUT",
      });
      return true;
    });
  }

  async sweepExpiredReservations(limit = 50): Promise<ReservationSweepResult> {
    return this.unitOfWork.transaction(async (repositories) => {
      const expired =
        await repositories.credits.listExpiredActiveReservations(
          new Date(),
          limit,
        );
      const released: string[] = [];
      const ambiguous: string[] = [];
      for (const reservation of expired) {
        const aiRun = reservation.aiRunId
          ? await repositories.aiRuns.get(reservation.aiRunId)
          : await repositories.aiRuns.findByWorkflow(
              reservation.workflowRunId,
            );
        if (
          aiRun?.status === "succeeded" ||
          aiRun?.status === "awaiting_approval"
        ) {
          await repositories.credits.deferReservationReview(
            reservation.id,
            new Date(Date.now() + 15 * 60 * 1000),
          );
          ambiguous.push(reservation.id);
          continue;
        }
        await repositories.credits.releaseReservation({
          reservationId: reservation.id,
          reason: "expired",
          idempotencyKey: `sweeper:${reservation.id}`,
        });
        if (aiRun && aiRun.status !== "failed") {
          await repositories.aiRuns.fail({
            runId: aiRun.id,
            errorCode: "TIMEOUT",
            errorMetadata: { recoveredBy: "reservation-sweeper" },
          });
        }
        await repositories.workflows.updateStatus({
          workflowRunId: reservation.workflowRunId,
          status: "failed",
          currentStep: null,
          errorCode: "TIMEOUT",
        });
        released.push(reservation.id);
      }
      return { released, ambiguous };
    });
  }
}
