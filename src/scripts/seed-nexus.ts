import dotenv from "dotenv";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { seedKbArticles } from "../services/ai-support.service.js";

dotenv.config();

async function seedNexus() {
  console.log("Seeding NEXUS Marketplace data...");

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@nexus.market";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "NEXUS-Admin-2024!";
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      firstName: "NEXUS",
      lastName: "Admin",
      username: "nexus_admin",
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

  const adminWallet = await prisma.adminWallet.upsert({
    where: { label: "main" },
    create: {
      label: "main",
      address: process.env.ADMIN_WALLET_ADDRESS ?? "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      blockchain: "TRC20",
    },
    update: {},
  });

  console.log(`Admin wallet: ${adminWallet.label} (${adminWallet.address})`);

  await seedKbArticles();
  console.log("KB articles seeded (6 articles)");

  const categories = [
    { name: "Game Accounts", slug: "game-accounts", description: "Game accounts and keys for sale" },
    { name: "Software Keys", slug: "software-keys", description: "Software licenses and activation keys" },
    { name: "Digital Products", slug: "digital-products", description: "Digital products and downloads" },
    { name: "Streaming Accounts", slug: "streaming-accounts", description: "Streaming service accounts" },
    { name: "Gift Cards", slug: "gift-cards", description: "Digital gift cards and vouchers" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { ...cat, sortOrder: categories.indexOf(cat), isActive: true },
      update: {},
    });
  }

  console.log(`Categories seeded (${categories.length})`);

  console.log("\nNEXUS Marketplace seed complete!");
  console.log(`  Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("  WARNING: Change the admin password after first login!");

  await prisma.$disconnect();
}

seedNexus().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});