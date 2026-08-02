import { getNeonCreditMaintenanceService } from "../infrastructure/database/neon/creditRuntime.js";
import { getNeonUnitOfWork } from "../infrastructure/database/neon/unitOfWork.js";

const limit = Math.max(1, Math.min(Number(process.argv[2] || 50), 100));
try {
  const result =
    await getNeonCreditMaintenanceService().sweepExpiredReservations(limit);
  console.log(
    JSON.stringify(
      {
        releasedCount: result.released.length,
        ambiguousCount: result.ambiguous.length,
        releasedReservationIds: result.released,
        ambiguousReservationIds: result.ambiguous,
      },
      null,
      2,
    ),
  );
} finally {
  await getNeonUnitOfWork().close();
}
