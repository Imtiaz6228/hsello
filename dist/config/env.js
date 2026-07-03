import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const emptyToUndefined = (value) => value === "" ? undefined : value;
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
    CORS_ORIGIN: z.string().min(1),
    COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_SECRET: z.string().min(32),
    CSRF_SECRET: z.string().min(32),
    ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
    SHORT_REFRESH_TOKEN_HOURS: z.coerce.number().int().positive().default(24),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: booleanFromEnv.default(false),
    SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
    EMAIL_FROM: z.string().min(3),
    ADMIN_NOTIFICATION_EMAIL: z.string().email(),
    UPLOAD_DIR: z.string().min(1).default("uploads"),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(2_097_152),
    TURNSTILE_REQUIRED: booleanFromEnv.default(false),
    TURNSTILE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional())
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
