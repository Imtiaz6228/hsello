import nodemailer from "nodemailer";
import { env } from "../config/env.js";

async function test() {
  console.log("SMTP Config:");
  console.log("  Host:", env.SMTP_HOST);
  console.log("  Port:", env.SMTP_PORT);
  console.log("  Secure:", env.SMTP_SECURE);
  console.log("  User:", env.SMTP_USER);
  console.log("  From:", env.EMAIL_FROM);
  console.log("");

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });

  try {
    // Verify connection
    await transport.verify();
    console.log("SMTP connection verified successfully.");

    // Send test email
    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      to: env.EMAIL_FROM, // Send to self
      subject: "Hsello SMTP Test",
      text: "If you receive this, SMTP is working correctly.",
    });
    console.log("Test email sent:", info.messageId);
  } catch (err) {
    console.error("SMTP FAILED:", err instanceof Error ? err.message : err);
  }

  transport.close();
}

test();