import { app } from "./api-app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

const server = app.listen(env.PORT, () => {
  console.log(`HSello API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down.`);
  const forcedExit = setTimeout(() => process.exit(1), 10_000);
  forcedExit.unref();
  server.close(async () => {
    await Promise.all([prisma.$disconnect(), redis?.quit()]);
    clearTimeout(forcedExit);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
