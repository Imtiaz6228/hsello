import type { RequestHandler } from "express";
import { verifyCsrfToken } from "../lib/cookies.js";
import { ApiError } from "./error-handler.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const publicAuthPaths = new Set([
  "/auth/register",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/reset-password"
]);

function apiPath(reqPath: string) {
  return reqPath.split("?")[0].replace(/^\/api/, "");
}

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  if (publicAuthPaths.has(apiPath(req.originalUrl))) {
    next();
    return;
  }

  if (!verifyCsrfToken(req)) {
    next(new ApiError(403, "Invalid or missing CSRF token.", "CSRF_INVALID"));
    return;
  }

  next();
};
