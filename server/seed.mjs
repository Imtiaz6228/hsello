import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const SALT_ROUNDS = 12;

  // ─── Default Admin Accounts ───────────────────────────────
  const adminAccounts = [
    {
      email: 'superadmin@example.com',
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+1234567890',
      password: 'SuperAdmin@12345',
      role: 'SUPER_ADMIN',
    },
    {
      email: 'admin@example.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567891',
      password: 'Admin@12345',
      role: 'ADMIN',
    },
    {
      email: 'moderator@example.com',
      username: 'moderator',
      firstName: 'Moderator',
      lastName: 'User',
      phone: '+1234567892',
      password: 'Moderator@12345',
      role: 'MODERATOR',
    },
  ];

  for (const account of adminAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);
      await prisma.user.create({
        data: {
          email: account.email,
          username: account.username,
          firstName: account.firstName,
          lastName: account.lastName,
          phone: account.phone,
          country: 'US',
          passwordHash,
          role: account.role,
          emailVerifiedAt: new Date(),
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
        },
      });
      console.log(`✅ Created ${account.role}: ${account.email}`);
    } else {
      // Update password if account exists to ensure it's the expected one
      const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);
      await prisma.user.update({
        where: { email: account.email },
        data: { passwordHash, role: account.role },
      });
      console.log(`🔄 Updated ${account.role}: ${account.email}`);
    }
  }

  // ─── Default Settings ─────────────────────────────────────
  const defaultSettings = [
    { key: 'site_name', value: 'Hsello Marketplace' },
    { key: 'site_description', value: 'Your trusted digital marketplace' },
    { key: 'support_email', value: 'support@hsello.com' },
    { key: 'currency', value: 'USD' },
    { key: 'language', value: 'en' },
    { key: 'timezone', value: 'America/Los_Angeles' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'allow_registration', value: 'true' },
    { key: 'commission_rate', value: '5' },
    { key: 'min_withdrawal', value: '50' },
    { key: 'logo_url', value: '' },
    { key: 'favicon_url', value: '' },
    { key: 'meta_description', value: 'Hsello - Your trusted digital marketplace' },
    { key: 'meta_keywords', value: 'marketplace, digital, products' },
    { key: 'social_facebook', value: '' },
    { key: 'social_twitter', value: '' },
    { key: 'social_instagram', value: '' },
  ];

  for (const setting of defaultSettings) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.setting.create({ data: setting });
      console.log(`✅ Setting created: ${setting.key}`);
    }
  }

  // ─── Default Categories ───────────────────────────────────
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const categories = [
      { name: 'Accounts', nameRu: 'Аккаунты', nameZh: '账户', slug: 'accounts', icon: 'User', description: 'Various online accounts' },
      { name: 'Software', nameRu: 'Программы', nameZh: '软件', slug: 'software', icon: 'Monitor', description: 'Software and applications' },
      { name: 'Gaming', nameRu: 'Игры', nameZh: '游戏', slug: 'gaming', icon: 'Gamepad2', description: 'Gaming products and services' },
      { name: 'Services', nameRu: 'Услуги', nameZh: '服务', slug: 'services', icon: 'Briefcase', description: 'Professional services' },
      { name: 'Digital Goods', nameRu: 'Цифровые товары', nameZh: '数字商品', slug: 'digital-goods', icon: 'File', description: 'Digital products and downloads' },
      { name: 'Education', nameRu: 'Образование', nameZh: '教育', slug: 'education', icon: 'GraduationCap', description: 'Courses and learning materials' },
    ];

    for (let i = 0; i < categories.length; i++) {
      await prisma.category.create({
        data: { ...categories[i], sortOrder: i },
      });
    }
    console.log(`✅ Created ${categories.length} categories`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('Default login credentials:');
  console.log('  Super Admin: superadmin@example.com / SuperAdmin@12345');
  console.log('  Admin:       admin@example.com / Admin@12345');
  console.log('  Moderator:   moderator@example.com / Moderator@12345');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });