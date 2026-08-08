import { TasteCalibrationService } from "../../../application/tasteCalibration/tasteCalibrationService.js";
import { getNeonUnitOfWork } from "./unitOfWork.js";
import {
  loadProjectEvidenceServer,
  loadProjectObservationsServer,
  loadTasteModelSnapshotServer,
} from "../../../lib/tasteCalibration/serverGraphLoader.js";
import type { TasteModelSnapshot } from "../../../lib/tasteModel/contracts.js";
import { getServerFirebaseAdmin } from "../../../lib/serverFirebaseAdmin.js";

export function getTasteCalibrationService(): TasteCalibrationService {
  const unitOfWork = getNeonUnitOfWork();
  return new TasteCalibrationService({
    repository: unitOfWork.repositories.tasteCalibration,
    loadEvidence: async (userId, projectId) => {
      const { db } = getServerFirebaseAdmin();
      if (!db) return [];
      return loadProjectEvidenceServer(db, userId, projectId);
    },
    loadObservations: async (userId, projectId) => {
      const { db } = getServerFirebaseAdmin();
      if (!db) return [];
      return loadProjectObservationsServer(db, userId, projectId);
    },
    loadBaseSnapshot: async (userId, projectId) => {
      const { db } = getServerFirebaseAdmin();
      if (!db) return null;
      const data = await loadTasteModelSnapshotServer(db, userId, projectId);
      return data as unknown as TasteModelSnapshot | null;
    },
  });
}
