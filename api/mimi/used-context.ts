import {
  handleMimiUsedContextGetRoute,
  handleMimiUsedContextPutRoute,
} from "../../lib/mimiUsedContextRoute.js";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return handleMimiUsedContextGetRoute(req, res);
  }
  if (req.method === "PUT") {
    return handleMimiUsedContextPutRoute(req, res);
  }
  res.status(405).json({ error: { message: "Method not allowed" } });
}
