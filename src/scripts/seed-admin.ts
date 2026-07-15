import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

async function seed() {
  const email = "imtiazbashir6868@gmail.com";
  const password = "Admin@123456";

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

  console.log(`Login with: ${email} / ${password}`);
  console.log("Change your password after first login.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});