import { verifyCsrfToken } from "../lib/cookies.js";
import { ApiError } from "./error-handler.js";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
export const csrfProtection = (req, _res, next) => {
    if (safeMethods.has(req.method)) {
        next();
        return;
    }
    if (!verifyCsrfToken(req)) {
        next(new ApiError(403, "Invalid or missing CSRF token.", "CSRF_INVALID"));
        return;
    }
    next();
};
