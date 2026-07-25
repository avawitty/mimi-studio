import { cors, requireMethod, sendJson } from "./apiUtils.js";

export const unavailableMimiRoute = (
  req: any,
  res: any,
  routeName: string,
  expectedMethod = "POST",
) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, expectedMethod)) return;

  sendJson(res, 501, {
    error: {
      code: "MIMI_ROUTE_NOT_CONFIGURED",
      message: `${routeName} is declared for routing compatibility but is not wired to a production handler yet.`,
    },
  });
};
