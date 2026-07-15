import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { env } from "../config/env.js";

async function seed() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an administrator.");
  }
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Update to SUPER_ADMIN and verify email
    await prisma.user.update({
      where: { email },
      data: {
        role: "SUPER_ADMIN",
        emailVerifiedAt: new Date()
      }
    });
    console.log(`Admin user ${email} already exists. Updated to SUPER_ADMIN with verified email.`);
  } else {
    await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "User",
        username: "admin",
        email,
        phone: "+9234567890",
        country: "US",
        city: "NY",
        role: "SUPER_ADMIN",
        emailVerifiedAt: new Date(),
        passwordHash: await hashPassword(password)
      }
    });
    console.log(`Created admin user: ${email}`);
  }

  console.log(`Administrator ${email} is ready. The password was not written to logs.`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
