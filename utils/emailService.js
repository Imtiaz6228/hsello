const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, we'll use a simple SMTP configuration
  // In production, you'd use services like SendGrid, Mailgun, etc.
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });

  return transporter;
};

// Send email verification
const sendEmailVerification = async (email, verificationToken, userName) => {
  try {
    const transporter = createTransporter();

    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"DigitalMarket" <${process.env.EMAIL_USER || 'noreply@digitalmarket.com'}>`,
      to: email,
      subject: 'Verify Your Email - DigitalMarket',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to DigitalMarket!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Thank you for signing up for DigitalMarket. To complete your registration and start exploring our platform, please verify your email address.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify My Email</a>
              </div>

              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${verificationUrl}</p>

              <p><strong>This verification link will expire in 24 hours.</strong></p>

              <p>If you didn't create an account with DigitalMarket, please ignore this email.</p>

              <p>Best regards,<br>The DigitalMarket Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${email}. If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${userName}!

        Thank you for signing up for DigitalMarket. To complete your registration, please verify your email address by clicking the link below:

        ${verificationUrl}

        This verification link will expire in 24 hours.

        If you didn't create an account with DigitalMarket, please ignore this email.

        Best regards,
        The DigitalMarket Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email verification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email verification failed:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordReset = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"DigitalMarket" <${process.env.EMAIL_USER || 'noreply@digitalmarket.com'}>`,
      to: email,
      subject: 'Reset Your Password - DigitalMarket',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>You have requested to reset your password for your DigitalMarket account. Click the button below to create a new password:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>

              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${resetUrl}</p>

              <p><strong>This password reset link will expire in 1 hour.</strong></p>

              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>

              <p>Best regards,<br>The DigitalMarket Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${email}. If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${userName}!

        You have requested to reset your password for your DigitalMarket account. Click the link below to create a new password:

        ${resetUrl}

        This password reset link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

        Best regards,
        The DigitalMarket Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Password reset email failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmailVerification,
  sendPasswordReset
};
