import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

async function seed() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error("ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters are required.");
  }

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

  console.log(`Admin account ready: ${email}`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
