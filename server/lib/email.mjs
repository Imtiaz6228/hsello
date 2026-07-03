import crypto from 'crypto';

/**
 * Email utility - In production, connect to a real SMTP service (SendGrid, Mailgun, etc.)
 * For development, emails are logged to console and stored for potential retrieval
 */

const devEmails = [];

/**
 * Hash a token for storage
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length = 48) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Send an email (logs to console in development)
 * In production, replace with an actual email service
 */
export async function sendEmail({ to, subject, html, text }) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && process.env.SMTP_USER) {
    // In production with SMTP configured, use nodemailer or similar
    // For now, log and store
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  }

  // Store email for development retrieval
  const emailRecord = {
    id: crypto.randomUUID(),
    to,
    subject,
    html,
    text,
    createdAt: new Date().toISOString(),
  };
  devEmails.push(emailRecord);

  // Keep only last 100 emails in memory
  if (devEmails.length > 100) {
    devEmails.shift();
  }

  console.log(`[EMAIL] 📧 To: ${to} | Subject: ${subject}`);
  return emailRecord;
}

/**
 * Get emails sent to a specific address (dev only)
 */
export function getDevEmails(to) {
  if (to) {
    return devEmails.filter((e) => e.to === to).reverse();
  }
  return [...devEmails].reverse();
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">Verify Your Email Address</h1>
      <p>Hello ${user.firstName},</p>
      <p>Thank you for registering with Hsello. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}"
           style="background-color: #4f46e5; color: white; padding: 14px 32px;
                  text-decoration: none; border-radius: 8px; font-size: 16px;
                  display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="color: #6b7280; word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Verify your email address - Hsello',
    html,
    text: `Verify your email: ${verificationUrl}`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">Reset Your Password</h1>
      <p>Hello ${user.firstName},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background-color: #4f46e5; color: white; padding: 14px 32px;
                  text-decoration: none; border-radius: 8px; font-size: 16px;
                  display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="color: #6b7280; word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Reset your password - Hsello',
    html,
    text: `Reset your password: ${resetUrl}`,
  });
}

/**
 * Notify admin about new seller application
 */
export async function sendAdminSellerNotification(sellerApplication) {
  const adminUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/sellers`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">New Seller Application</h2>
      <p>A new seller application has been submitted:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Store:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${sellerApplication.storeName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${sellerApplication.fullLegalName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${sellerApplication.email}</td></tr>
      </table>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${adminUrl}"
           style="background-color: #4f46e5; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 8px;">
          Review Application
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@hsello.com',
    subject: `New Seller Application - ${sellerApplication.storeName}`,
    html,
    text: `New seller application from ${sellerApplication.fullLegalName} for store "${sellerApplication.storeName}"`,
  });
}