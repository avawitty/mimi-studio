import { handleMimiSignalReaderRoute } from "../../lib/mimiSignalReaderRoute.js";

export default async function handler(req: any, res: any) {
  return handleMimiSignalReaderRoute(req, res);
}
