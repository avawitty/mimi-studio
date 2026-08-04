import { sendJson } from "./apiUtils.js";

export function sendOperationalError(
  res: any,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  sendJson(res, status, {
    code,
    message,
    ...(details ?? {}),
  });
}

export function requireOperationalMethod(
  req: any,
  res: any,
  method: "GET" | "POST",
): boolean {
  if (String(req.method || "GET").toUpperCase() === method) return true;
  sendOperationalError(
    res,
    405,
    "METHOD_NOT_ALLOWED",
    `Use ${method} for this endpoint.`,
  );
  return false;
}

export function publicOperationalMessage(
  status: number,
  fallback: string,
  internalMessage: string,
): string {
  return status >= 400 && status < 500 ? internalMessage : fallback;
}
