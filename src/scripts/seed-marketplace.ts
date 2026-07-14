import dotenv from "dotenv";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { seedKbArticles } from "../services/ai-support.service.js";
import { ensureDefaultMarketplaceCategories } from "../services/category.service.js";

dotenv.config();

async function seedMarketplace() {
  console.log("Seeding HSello marketplace data...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 16) {
    throw new Error("ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters are required.");
  }
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      firstName: "HSello",
      lastName: "Admin",
      username: "hsello_admin",
      email: adminEmail,
      phone: "+10000000000",
      country: "United States",
      city: "New York",
      passwordHash,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
    update: { role: "ADMIN", emailVerifiedAt: new Date() },
  });

  console.log(`Admin user: ${admin.email} (${admin.role})`);

  const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS;
  if (!adminWalletAddress || adminWalletAddress.length < 20) throw new Error("ADMIN_WALLET_ADDRESS is required and must contain at least 20 characters.");
  const adminWallet = await prisma.adminWallet.upsert({
    where: { label: "main" },
    create: {
      label: "main",
      address: adminWalletAddress,
      blockchain: "TRC20",
    },
    update: {},
  });

  console.log(`Admin wallet: ${adminWallet.label} (${adminWallet.address})`);

  await seedKbArticles();
  console.log("KB articles seeded (6 articles)");

  await ensureDefaultMarketplaceCategories();
  console.log("Marketplace categories seeded");

  console.log("\nHSello marketplace seed complete!");
  console.log(`  Admin account ready: ${adminEmail}`);

  await prisma.$disconnect();
}

seedMarketplace().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
