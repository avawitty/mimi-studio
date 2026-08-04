import { sendJson } from "../../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    sendJson(res, 405, {
      code: "METHOD_NOT_ALLOWED",
      message: "Use GET for this endpoint.",
    });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = String(req.headers?.authorization || "");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    sendJson(res, 401, {
      code: "UNAUTHORIZED",
      message: "Valid cron authorization is required.",
    });
    return;
  }

  try {
    const { getNeonCreditMaintenanceService } = await import(
      "../../infrastructure/database/neon/creditRuntime.js"
    );
    const result =
      await getNeonCreditMaintenanceService().sweepExpiredReservations(50);
    if (result.ambiguous.length > 0) {
      console.error("MIMI // Reservation sweep needs reconciliation:", {
        count: result.ambiguous.length,
        reservationIds: result.ambiguous,
      });
    }
    sendJson(res, 200, {
      released: result.released.length,
      reconciliationRequired: result.ambiguous.length,
    });
  } catch (error) {
    console.error("MIMI // Reservation sweep failed:", error);
    sendJson(res, 500, {
      code: "RESERVATION_SWEEP_FAILED",
      message: "Reservation maintenance failed.",
    });
  }
}
