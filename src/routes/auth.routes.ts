import { Router } from "express";
import { setAuthCookies, issueCsrfToken } from "../lib/cookies.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { authLimiter, sensitiveLimiter } from "../middleware/rate-limit.js";
import { imageUpload } from "../middleware/upload.js";
import {
  availabilitySchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "../schemas/auth.schemas.js";
import {
  changePassword,
  createSession,
  getAvailability,
  getCurrentUser,
  getRefreshTokenFromRequest,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken
} from "../services/auth.service.js";
import { verifyCaptcha } from "../services/captcha.service.js";
import { clearAuthCookies } from "../lib/cookies.js";

export const authRouter = Router();

authRouter.get("/availability", authLimiter, asyncHandler(async (req, res) => {
  const input = availabilitySchema.parse(req.query);
  const availability = await getAvailability(input.email, input.username);

  res.json(availability);
}));

authRouter.post(
  "/register",
  authLimiter,
  imageUpload.single("profilePicture"),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    await verifyCaptcha(input.captchaToken, req.ip);

    const { user, verificationEmailSent } = await registerUser(input, req.file);
    const session = await createSession(
      {
        id: user.id,
        role: user.role,
        emailVerifiedAt: null
      },
      req,
      true
    );

    setAuthCookies(res, session.accessToken, session.refreshToken, session.rememberMe);
    const csrfToken = issueCsrfToken(res);

    res.status(201).json({
      message: verificationEmailSent
        ? "Account created. Check your email to verify it."
        : "Account created, but the verification email could not be delivered. Request a new link to continue.",
      user,
      csrfToken,
      verificationEmailSent
    });
  })
);

authRouter.post("/login", authLimiter, asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { user, session } = await loginUser(input, req);

  setAuthCookies(res, session.accessToken, session.refreshToken, session.rememberMe);
  const csrfToken = issueCsrfToken(res);

  res.json({
    message: "Signed in successfully.",
    user,
    csrfToken
  });
}));

authRouter.post("/refresh", asyncHandler(async (req, res) => {
  const { user, session } = await refreshUserSession(getRefreshTokenFromRequest(req), req);

  setAuthCookies(res, session.accessToken, session.refreshToken, session.rememberMe);
  const csrfToken = issueCsrfToken(res);

  res.json({
    user,
    csrfToken
  });
}));

authRouter.post("/logout", asyncHandler(async (req, res) => {
  await logoutUser(getRefreshTokenFromRequest(req));
  clearAuthCookies(res);

  res.json({
    message: "Signed out successfully."
  });
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth!.id);

  res.json({ user });
}));

authRouter.post("/verify-email", sensitiveLimiter, asyncHandler(async (req, res) => {
  const input = verifyEmailSchema.parse(req.body);
  const user = await verifyEmailToken(input.token);

  res.json({
    message: "Email verified successfully.",
    user
  });
}));

authRouter.post("/resend-verification", sensitiveLimiter, asyncHandler(async (req, res) => {
  const input = resendVerificationSchema.parse(req.body);
  await resendVerification(input.email);

  res.json({
    message: "If that account needs verification, a new email has been sent."
  });
}));

authRouter.post("/forgot-password", sensitiveLimiter, asyncHandler(async (req, res) => {
  const input = forgotPasswordSchema.parse(req.body);
  await verifyCaptcha(input.captchaToken, req.ip);
  await requestPasswordReset(input.email);

  res.json({
    message: "If an account exists for that email, a reset link has been sent."
  });
}));

authRouter.post("/reset-password", sensitiveLimiter, asyncHandler(async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  await resetPassword(input.token, input.password);
  clearAuthCookies(res);

  res.json({
    message: "Password reset successfully. Please sign in with your new password."
  });
}));

authRouter.post(
  "/change-password",
  requireAuth,
  requireVerifiedUser,
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.auth!.id, input.currentPassword, input.password);
    clearAuthCookies(res);

    res.json({
      message: "Password changed successfully. Please sign in again."
    });
  })
);
