import type { RequestHandler } from "express";
import { verifyCsrfToken } from "../lib/cookies.js";
import { ApiError } from "./error-handler.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const csrfExemptWebhookPaths = new Set([
  "/commerce/crypto/webhook"
]);

function apiPath(reqPath: string) {
  const path = reqPath.split("?")[0];

  try {
    return new URL(path).pathname.replace(/^(?:\/api)+/, "") || "/";
  } catch {
    return path.replace(/^(?:\/api)+/, "") || "/";
  }
}

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  if (csrfExemptWebhookPaths.has(apiPath(req.originalUrl))) {
    next();
    return;
  }

  if (!verifyCsrfToken(req)) {
    next(new ApiError(403, "Invalid or missing CSRF token.", "CSRF_INVALID"));
    return;
  }

  next();
};
