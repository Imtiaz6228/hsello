import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "ERROR",
    public details?: unknown
  ) {
    super(message);
  }
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.path}`, "NOT_FOUND"));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      message: error.message,
      code: "UPLOAD_INVALID"
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({
      message: "An account with that unique value already exists.",
      code: "UNIQUE_CONSTRAINT"
    });
    return;
  }

  if (error instanceof Error && error.message.includes("Only JPEG")) {
    res.status(400).json({
      message: error.message,
      code: "UPLOAD_INVALID"
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR"
  });
}
