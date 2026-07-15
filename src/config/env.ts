import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value;
const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  CORS_ORIGIN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  SHORT_REFRESH_TOKEN_HOURS: z.coerce.number().int().positive().default(24),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
  ADMIN_NOTIFICATION_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  PRIVATE_UPLOAD_DIR: z.string().min(1).default("private-uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(8_388_608),
  MAX_PRODUCT_FILE_BYTES: z.coerce.number().int().positive().default(104_857_600),
  TURNSTILE_REQUIRED: booleanFromEnv.default(false),
  TURNSTILE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  BANK_TRANSFER_INSTRUCTIONS: z.preprocess(emptyToUndefined, z.string().optional()),
  CRYPTO_PAYMENT_INSTRUCTIONS: z.preprocess(emptyToUndefined, z.string().optional()),
  CRYPTO_PAYMENT_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  CRYPTO_PAYMENT_ASSET: z.preprocess(emptyToUndefined, z.string().default("USDT")),
  CRYPTO_PAYMENT_NETWORK: z.preprocess(emptyToUndefined, z.string().default("TRC20")),
  CRYPTO_PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  CRYPTO_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  ADMIN_WALLET_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  ADMIN_WALLET_LABEL: z.string().default("main"),
  TOPUP_TRC20_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_BEP20_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_ERC20_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_BTC_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_ETH_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_SOL_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  COMMISSION_SALE_PERCENT: z.coerce.number().int().min(0).max(50).default(10),
  COMMISSION_WITHDRAW_PERCENT: z.coerce.number().int().min(0).max(20).default(3),
  FROZEN_HOLD_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  DOWNLOAD_LINK_EXPIRY_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  TRONGRID_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ETHERSCAN_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  BSCSCAN_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NOWPAYMENTS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NOWPAYMENTS_IPN_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_PUBLIC_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional())
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsed.data.TURNSTILE_REQUIRED && !parsed.data.TURNSTILE_SECRET_KEY) {
  throw new Error("TURNSTILE_SECRET_KEY is required when TURNSTILE_REQUIRED=true");
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
