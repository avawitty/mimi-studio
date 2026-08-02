import { getNeonCreditMaintenanceService } from "../infrastructure/database/neon/creditRuntime.js";

const limit = Math.max(1, Math.min(Number(process.argv[2] || 50), 100));
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
