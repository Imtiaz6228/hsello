import multer from "multer";
import { Prisma } from "@prisma/client";
export class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code = "ERROR", details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}
export function notFound(req, _res, next) {
    next(new ApiError(404, `Route not found: ${req.method} ${req.path}`, "NOT_FOUND"));
}
export function errorHandler(error, _req, res, _next) {
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
