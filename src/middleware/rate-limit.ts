import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis.js";

function sharedStore(prefix: string) {
  if (!redis) return undefined;
  const client = redis;
  return new RedisStore({
    prefix: `hsello:${prefix}:`,
    sendCommand: async (...args: string[]) => (await client.call(args[0], ...args.slice(1)) ?? 0) as never
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("general")
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("auth"),
  message: {
    message: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMITED"
  }
});

export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("sensitive"),
  message: {
    message: "Too many requests. Please wait before trying again.",
    code: "RATE_LIMITED"
  }
});

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("payment"),
  message: { message: "Too many payment requests. Please wait and try again.", code: "RATE_LIMITED" }
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("upload"),
  message: { message: "Upload limit reached. Please wait before uploading again.", code: "RATE_LIMITED" }
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: sharedStore("search"),
  message: { message: "Search rate limit reached. Please slow down.", code: "RATE_LIMITED" }
});
