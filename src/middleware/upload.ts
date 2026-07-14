import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { fileTypeFromFile } from "file-type";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "./error-handler.js";

export const uploadRoot = path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.resolve(process.cwd(), env.UPLOAD_DIR);
export const privateUploadRoot = path.isAbsolute(env.PRIVATE_UPLOAD_DIR) ? env.PRIVATE_UPLOAD_DIR : path.resolve(process.cwd(), env.PRIVATE_UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });
fs.mkdirSync(privateUploadRoot, { recursive: true });

const actualImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const actualProductTypes = new Set([
  "application/zip", "application/pdf", "audio/mpeg", "video/mp4", "image/jpeg", "image/png", "image/webp"
]);
const actualDocumentTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function randomFileName(originalName: string) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12);
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function diskStorage(root: string) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, root),
    filename: (_req, file, callback) => callback(null, randomFileName(file.originalname))
  });
}

async function safelyUnlink(file?: Express.Multer.File) {
  if (file?.path) await fs.promises.unlink(file.path).catch(() => undefined);
}

export async function deleteUploadedAsset(file?: Express.Multer.File) {
  if (!file) return;
  await Promise.all([
    safelyUnlink(file),
    prisma.publicUpload.deleteMany({ where: { fileName: file.filename } }).catch(() => undefined)
  ]);
}

async function normalizePublicImage(file: Express.Multer.File) {
  const detected = await fileTypeFromFile(file.path);
  if (!detected || !actualImageTypes.has(detected.mime)) {
    throw new ApiError(400, "The uploaded file is not a valid JPEG, PNG, or WebP image.", "IMAGE_CONTENT_INVALID");
  }
  const image = sharp(file.path, { failOn: "error", limitInputPixels: 25_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 25_000_000) {
    throw new ApiError(400, "Image dimensions are invalid or exceed 25 megapixels.", "IMAGE_DIMENSIONS_INVALID");
  }

  const normalizedName = `${path.parse(file.filename).name}.webp`;
  const normalizedPath = path.join(path.dirname(file.path), normalizedName);
  await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toFile(normalizedPath);
  if (normalizedPath !== file.path) await fs.promises.unlink(file.path).catch(() => undefined);
  const stat = await fs.promises.stat(normalizedPath);
  file.filename = normalizedName;
  file.path = normalizedPath;
  file.mimetype = "image/webp";
  file.size = stat.size;
}

async function validatePrivateFile(file: Express.Multer.File, allowed: Set<string>, allowText = false) {
  const detected = await fileTypeFromFile(file.path);
  if (detected && allowed.has(detected.mime)) {
    file.mimetype = detected.mime;
    return;
  }
  if (allowText && ["text/plain", "text/csv", "application/csv"].includes(file.mimetype)) {
    const handle = await fs.promises.open(file.path, "r");
    try {
      const sample = Buffer.alloc(Math.min(file.size, 8192));
      await handle.read(sample, 0, sample.length, 0);
      if (!sample.includes(0)) return;
    } finally {
      await handle.close();
    }
  }
  throw new ApiError(400, "The uploaded file contents do not match an allowed file type.", "FILE_CONTENT_INVALID");
}

async function persistPublicImage(file: Express.Multer.File) {
  const data = await fs.promises.readFile(file.path);
  await prisma.publicUpload.create({
    data: { fileName: file.filename, mimeType: file.mimetype, sizeBytes: file.size, data }
  });
}

const publicImageParser = multer({
  storage: diskStorage(uploadRoot),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 }
});

export const imageUpload = {
  single(fieldName: string): RequestHandler {
    const parse = publicImageParser.single(fieldName);
    return (req, res, next) => parse(req, res, (parseError) => {
      if (parseError) return next(parseError);
      if (!req.file) return next();
      void normalizePublicImage(req.file)
        .then(() => persistPublicImage(req.file!))
        .then(() => next())
        .catch(async (error) => { await safelyUnlink(req.file); next(error); });
    });
  }
};

export function publicUploadUrl(fileName: string) {
  return `${env.API_URL.replace(/\/+$/, "")}/uploads/${encodeURIComponent(fileName)}`;
}

export function resolvePrivateUploadPath(storagePath: string) {
  const resolved = path.resolve(storagePath);
  const relative = path.relative(privateUploadRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ApiError(403, "Stored file path is outside private storage.", "PRIVATE_FILE_PATH_INVALID");
  }
  return resolved;
}

const productParser = multer({
  storage: diskStorage(privateUploadRoot),
  limits: { fileSize: env.MAX_PRODUCT_FILE_BYTES, files: 1 }
});

export const productFileUpload = {
  single(fieldName: string): RequestHandler {
    const parse = productParser.single(fieldName);
    return (req, res, next) => parse(req, res, (parseError) => {
      if (parseError) return next(parseError);
      if (!req.file) return next();
      void validatePrivateFile(req.file, actualProductTypes, true)
        .then(() => next())
        .catch(async (error) => { await safelyUnlink(req.file); next(error); });
    });
  }
};

const sellerDocumentParser = multer({
  storage: diskStorage(privateUploadRoot),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 2 }
});

export const sellerDocumentUpload = {
  fields(fields: readonly { name: string; maxCount?: number }[]): RequestHandler {
    const parse = sellerDocumentParser.fields(fields);
    return (req, res, next) => parse(req, res, (parseError) => {
      if (parseError) return next(parseError);
      const files = Object.values((req.files ?? {}) as Record<string, Express.Multer.File[]>).flat();
      void Promise.all(files.map((file) => validatePrivateFile(file, actualDocumentTypes)))
        .then(() => next())
        .catch(async (error) => { await Promise.all(files.map(safelyUnlink)); next(error); });
    });
  }
};
