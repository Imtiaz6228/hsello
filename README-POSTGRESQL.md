# PostgreSQL Deployment Guide for DigitalMarket

This guide shows you how to deploy the DigitalMarket application using PostgreSQL instead of MongoDB, with email verification disabled.

## 🚀 Quick Start with PostgreSQL

### 1. Install PostgreSQL on VPS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell
CREATE DATABASE digitalmarket;
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE digitalmarket TO your_db_user;
ALTER USER your_db_user CREATEDB;
\q
```

### 2. Configure Environment

```bash
cd hsello
cp .env.vps .env
nano .env
```

Update your `.env` file:
```env
DATABASE_URL="postgresql://your_db_user:your_secure_password@localhost:5432/digitalmarket?schema=public"
REQUIRE_EMAIL_VERIFICATION=false
```

### 3. Install Dependencies & Setup Database

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db-generate

# Create database tables
npm run db-push
```

### 4. Start Application

```bash
# Development
npm run dev-postgres

# Production with PM2
npm run pm2-start-postgres
```

## 🗄️ Database Options

### Option A: Local PostgreSQL (Free)
- Install PostgreSQL on your VPS
- Best for single-server deployments
- No additional costs

### Option B: Managed PostgreSQL (Recommended for Production)
- **Supabase** (Free tier available)
- **Neon** (Serverless PostgreSQL)
- **ElephantSQL** (Cloud PostgreSQL)
- **AWS RDS PostgreSQL**

## 📋 PostgreSQL Deployment Checklist

- [ ] PostgreSQL installed and running
- [ ] Database and user created
- [ ] `.env` configured with correct DATABASE_URL
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma client generated (`npm run db-generate`)
- [ ] Database schema pushed (`npm run db-push`)
- [ ] Application starts without errors
- [ ] Can signup/login without email verification

## 🔧 Key Differences from MongoDB

| Feature | MongoDB | PostgreSQL |
|---------|---------|------------|
| **App File** | `app.js` | `app-postgres.js` |
| **ORM** | Mongoose | Prisma |
| **Connection** | `MONGODB_URI` | `DATABASE_URL` |
| **Schema** | Dynamic | Strict (Prisma) |
| **Migrations** | Manual | Automatic |

## 🧪 Testing PostgreSQL Setup

### 1. Test Database Connection

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ Connection failed:', err.message))
  .finally(() => prisma.$disconnect());
"
```

### 2. Test User Creation

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true
      }
    });
    console.log('✅ User created:', user.id);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
"
```

## 🚀 Production Deployment Commands

```bash
# Install dependencies
npm install

# Setup database
npm run db-generate
npm run db-push

# Start with PM2
npm run pm2-start-postgres

# Check status
pm2 status
pm2 logs digitalmarket-postgres
```

## 🔐 Security Notes

- Use strong passwords for database users
- Enable SSL for database connections in production
- Regularly backup your PostgreSQL database
- Use connection pooling for high-traffic applications

## 📞 Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if port 5432 is open
sudo netstat -tlnp | grep 5432

# Test connection manually
psql -h localhost -U your_db_user -d digitalmarket
```

### Migration Issues
```bash
# Reset database (WARNING: Deletes all data)
npm run db-push -- --force-reset

# View migration status
npx prisma migrate status
```

## 🎯 Why PostgreSQL?

- **ACID Compliance**: Strong data consistency
- **SQL Standard**: Industry-standard queries
- **Performance**: Excellent for complex queries
- **Scalability**: Better horizontal scaling options
- **Ecosystem**: Rich tooling and community support

Your application is now ready for PostgreSQL deployment with email verification disabled!