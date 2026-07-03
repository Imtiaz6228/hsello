import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env, isProduction } from "./config/env.js";
import { issueCsrfToken } from "./lib/cookies.js";
import { uploadRoot } from "./middleware/upload.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { generalLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { sellerRouter } from "./routes/seller.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

function normalizeOrigin(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

const allowedOriginRules = [env.APP_URL, env.API_URL, ...(env.CORS_ORIGIN?.split(",") ?? [])]
  .map(normalizeOrigin)
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOriginRules.some((rule) => {
    if (!rule.includes("*")) {
      return rule === normalizedOrigin;
    }

    const escaped = rule
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^.]+");
    return new RegExp(`^${escaped}$`, "i").test(normalizedOrigin);
  });
}

export const app = express();

app.set("trust proxy", isProduction ? 1 : 0);
app.disable("x-powered-by");

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS."));
  }
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(generalLimiter);

app.use("/uploads", express.static(uploadRoot, {
  index: false,
  immutable: true,
  maxAge: "7d"
}));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: env.NODE_ENV });
});

app.get("/api/csrf", (_req, res) => {
  res.json({
    csrfToken: issueCsrfToken(res)
  });
});

app.use("/api", csrfProtection);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/admin", adminRouter);

// Railway builds both targets from this one root and can serve the SPA and API
// on the same origin. That is the most reliable option for cookie-based auth.
const frontendRoot = path.resolve(process.cwd(), "dist");
const frontendIndex = path.join(frontendRoot, "index.html");

if (isProduction && fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendRoot, {
    index: false,
    maxAge: "1h"
  }));

  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(frontendIndex);
  });
}

app.use(notFound);
app.use(errorHandler);
