import nodemailer from "nodemailer";
import { env } from "../config/env.js";
const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
        }
        : undefined
});
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
async function sendMail(to, subject, html) {
    await transport.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html
    });
}
export function sendVerificationEmail(to, firstName, token) {
    const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    return sendMail(to, "Verify your email address", `
      <p>Hello ${escapeHtml(firstName)},</p>
      <p>Please verify your email address to finish securing your account.</p>
      <p><a href="${url}">Verify email address</a></p>
      <p>This link expires in 24 hours.</p>
    `);
}
export function sendPasswordResetEmail(to, firstName, token) {
    const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    return sendMail(to, "Reset your password", `
      <p>Hello ${escapeHtml(firstName)},</p>
      <p>Use the secure link below to reset your password.</p>
      <p><a href="${url}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request it, you can ignore this email.</p>
    `);
}
export function sendSellerApplicationNotification(storeName, applicantEmail) {
    return sendMail(env.ADMIN_NOTIFICATION_EMAIL, "New seller application", `
      <p>A new seller application is waiting for review.</p>
      <p><strong>Store:</strong> ${escapeHtml(storeName)}</p>
      <p><strong>Applicant:</strong> ${escapeHtml(applicantEmail)}</p>
      <p><a href="${env.APP_URL}/admin/seller-applications">Review application</a></p>
    `);
}
