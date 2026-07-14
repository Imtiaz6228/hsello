import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { env, isProduction } from "./config/env.js";
import { issueCsrfToken } from "./lib/cookies.js";
import { uploadRoot } from "./middleware/upload.js";
import { csrfProtection } from "./middleware/csrf.js";
import { asyncHandler, errorHandler, notFound } from "./middleware/error-handler.js";
import { generalLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { sellerRouter } from "./routes/seller.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { marketplaceRouter } from "./routes/marketplace.routes.js";
import { commerceRouter } from "./routes/commerce.routes.js";
import { walletRouter } from "./routes/wallet.routes.js";
import { supportAssistantRouter } from "./routes/assistant.routes.js";
import { prisma } from "./lib/prisma.js";

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

app.use((req, res, next) => {
  const requestId = req.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  const startedAt = performance.now();
  res.once("finish", () => {
    if (req.path === "/health" || req.path === "/api/health") return;
    console.info(JSON.stringify({ level: "info", event: "http_request", requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - startedAt) }));
  });
  if (isProduction && req.get("x-forwarded-proto") && req.get("x-forwarded-proto") !== "https") {
    res.redirect(308, `${new URL(env.API_URL).origin}${req.originalUrl}`);
    return;
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      styleSrcElem: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", env.API_URL],
      frameSrc: ["https://challenges.cloudflare.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
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
app.use(compression());
app.use(generalLimiter);

app.use("/uploads", express.static(uploadRoot, {
  index: false,
  immutable: true,
  maxAge: "7d"
}));

app.get("/uploads/:fileName", asyncHandler(async (req, res) => {
  const requestedFileName = Array.isArray(req.params.fileName) ? req.params.fileName[0] : req.params.fileName;
  const fileName = path.basename(requestedFileName);
  if (!fileName || fileName !== requestedFileName) {
    res.status(400).json({ message: "Invalid media path.", code: "MEDIA_PATH_INVALID" });
    return;
  }

  const upload = await prisma.publicUpload.findUnique({
    where: { fileName },
    select: { mimeType: true, data: true, sizeBytes: true, createdAt: true }
  });
  if (!upload) {
    res.status(404).json({ message: "This media file is no longer available. Upload a replacement image.", code: "MEDIA_NOT_FOUND" });
    return;
  }

  res.setHeader("Content-Type", upload.mimeType);
  res.setHeader("Content-Length", String(upload.sizeBytes));
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  res.setHeader("Last-Modified", upload.createdAt.toUTCString());
  res.send(Buffer.from(upload.data));
}));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV
  });
});

app.get("/api/health", asyncHandler(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "connected", environment: env.NODE_ENV });
  } catch {
    res.status(503).json({ status: "unavailable", database: "disconnected", environment: env.NODE_ENV });
  }
}));

function sendRequestToken(_req: express.Request, res: express.Response) {
  res.json({
    csrfToken: issueCsrfToken(res)
  });
}

app.get("/api/csrf", sendRequestToken);
app.get("/api/session/bootstrap", sendRequestToken);

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /checkout\nDisallow: /orders\nDisallow: /seller\nDisallow: /support\nDisallow: /sign-in\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /verify-email\nDisallow: /verify-required\nSitemap: ${env.APP_URL}/sitemap.xml\n`);
});

app.get("/sitemap.xml", asyncHandler(async (_req, res) => {
  const [products, categories, stores] = await Promise.all([
    prisma.product.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.sellerProfile.findMany({ where: { isVerified: true, isSuspended: false }, select: { slug: true, updatedAt: true } })
  ]);
  const urls = [
    { path: "/", updatedAt: new Date() }, { path: "/catalog", updatedAt: new Date() },
    { path: "/blog", updatedAt: new Date() },
    ...["/terms", "/privacy", "/refund-policy", "/seller-policy", "/buyer-protection", "/prohibited-products", "/copyright", "/contact", "/about"].map((path) => ({ path, updatedAt: new Date("2026-07-14T00:00:00.000Z") })),
    ...products.map((item) => ({ path: `/products/${item.slug}`, updatedAt: item.updatedAt })),
    ...categories.map((item) => ({ path: `/categories/${item.slug}`, updatedAt: item.updatedAt })),
    ...stores.map((item) => ({ path: `/stores/${item.slug}`, updatedAt: item.updatedAt }))
  ];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item) => `<url><loc>${env.APP_URL}${item.path}</loc><lastmod>${item.updatedAt.toISOString()}</lastmod></url>`).join("")}</urlset>`);
}));

app.use("/api", csrfProtection);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/commerce", commerceRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/admin", adminRouter);
app.use("/api/assistant", supportAssistantRouter);

// Railway builds both targets from this one root and can serve the SPA and API
// on the same origin. That is the most reliable option for cookie-based auth.
const frontendRoot = path.resolve(process.cwd(), "dist");
const frontendIndex = path.join(frontendRoot, "index.html");

if (isProduction && fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendRoot, {
    index: false,
    extensions: ["html"],
    maxAge: "1h",
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
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
