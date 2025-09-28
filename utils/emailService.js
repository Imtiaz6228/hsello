const nodemailer = require('nodemailer');

// Create transporter with enhanced error handling for VPS
const createTransporter = () => {
  try {
    // Check if email configuration is provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email configuration missing. Email features will be disabled.');
      return null;
    }

    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Enhanced settings for VPS hosting
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000,    // 30 seconds
      socketTimeout: 60000,      // 60 seconds
      // Handle self-signed certificates on VPS
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log(`📧 Email service configured: ${config.host}:${config.port}`);
    return nodemailer.createTransporter(config);
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error.message);
    return null;
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Email transporter not configured' };
    }

    await transporter.verify();
    console.log('✅ Email service connection verified');
    return { success: true };
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Send email verification with enhanced error handling
const sendEmailVerification = async (email, verificationToken, userName) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('⚠️ Email service not configured. Skipping email verification.');
      return { 
        success: false, 
        error: 'Email service not configured',
        skipEmail: true 
      };
    }

    // Test connection first
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('❌ Email service verification failed:', verifyError.message);
      return { 
        success: false, 
        error: `Email service unavailable: ${verifyError.message}`,
        skipEmail: true 
      };
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"DigitalMarket" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - DigitalMarket',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .url-box { word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; }
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
              <div class="url-box">${verificationUrl}</div>

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
    console.log('📧 Verification URL:', verificationUrl);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email verification failed:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Check your email credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Check your network connection.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email service timeout. Please try again later.';
    }

    return { success: false, error: errorMessage };
  }
};

// Send password reset email
const sendPasswordReset = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('⚠️ Email service not configured. Cannot send password reset.');
      return { 
        success: false, 
        error: 'Email service not configured',
        skipEmail: true 
      };
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"DigitalMarket" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - DigitalMarket',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .url-box { word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; }
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
              <div class="url-box">${resetUrl}</div>

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
    
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Check your email credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Check your network connection.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email service timeout. Please try again later.';
    }

    return { success: false, error: errorMessage };
  }
};

module.exports = {
  sendEmailVerification,
  sendPasswordReset,
  testEmailConnection
};
