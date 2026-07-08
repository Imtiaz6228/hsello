import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";

export const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

fs.mkdirSync(uploadRoot, { recursive: true });

export const privateUploadRoot = path.isAbsolute(env.PRIVATE_UPLOAD_DIR)
  ? env.PRIVATE_UPLOAD_DIR
  : path.resolve(process.cwd(), env.PRIVATE_UPLOAD_DIR);

fs.mkdirSync(privateUploadRoot, { recursive: true });

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
      return;
    }

    callback(null, true);
  }
});

export function publicUploadUrl(fileName: string) {
  return `${env.API_URL}/uploads/${encodeURIComponent(fileName)}`;
}

const allowedProductTypes = new Set([
  "application/zip", "application/x-zip-compressed", "application/pdf",
  "application/octet-stream", "text/plain", "audio/mpeg", "video/mp4",
  "image/jpeg", "image/png", "image/webp"
]);

const productStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateUploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

export const productFileUpload = multer({
  storage: productStorage,
  limits: { fileSize: env.MAX_PRODUCT_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedProductTypes.has(file.mimetype)) {
      callback(new Error("This product file type is not allowed."));
      return;
    }
    callback(null, true);
  }
});


const allowedSellerDocumentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const sellerDocumentStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateUploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

export const sellerDocumentUpload = multer({
  storage: sellerDocumentStorage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 2
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedSellerDocumentTypes.has(file.mimetype)) {
      callback(new Error("Seller documents must be JPEG, PNG, WebP, or PDF files."));
      return;
    }
    callback(null, true);
  }
});
