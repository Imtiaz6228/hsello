import type { Request, Response } from "express";
import { env, isProduction } from "../config/env.js";
import { hmacSha256, randomToken, safeEqual } from "./crypto.js";

// The __Host- prefix requires Secure, which is correct in production but makes
// browsers reject local HTTP cookies. Keep the strong prefix only on HTTPS.
export const ACCESS_TOKEN_COOKIE = isProduction ? "__Host-auth_access" : "auth_access";
export const REFRESH_TOKEN_COOKIE = isProduction ? "__Host-auth_refresh" : "auth_refresh";
export const CSRF_COOKIE = isProduction ? "__Host-auth_csrf" : "auth_csrf";

function baseCookieOptions() {
  return {
    secure: isProduction,
    // Vercel and Railway are different sites. Production auth cookies must be
    // explicitly cross-site or the browser will silently withhold them.
    sameSite: isProduction ? "none" as const : "lax" as const,
    path: "/"
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean
) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: env.ACCESS_TOKEN_MINUTES * 60 * 1000
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: rememberMe
      ? env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
      : env.SHORT_REFRESH_TOKEN_HOURS * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
}

export function issueCsrfToken(res: Response) {
  const token = randomToken(32);
  const signature = hmacSha256(token, env.CSRF_SECRET);

  res.cookie(CSRF_COOKIE, `${token}.${signature}`, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge: 2 * 60 * 60 * 1000
  });

  return token;
}

export function verifyCsrfToken(req: Request) {
  const headerToken = req.get("x-csrf-token");
  const cookieValue = req.cookies?.[CSRF_COOKIE] as string | undefined;

  if (!headerToken || !cookieValue) {
    return false;
  }

  const [cookieToken, signature] = cookieValue.split(".");
  if (!cookieToken || !signature) {
    return false;
  }

  const expectedSignature = hmacSha256(cookieToken, env.CSRF_SECRET);

  return safeEqual(signature, expectedSignature) && safeEqual(headerToken, cookieToken);
}
