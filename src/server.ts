import { app } from "./api-app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultMarketplaceCategories } from "./services/category.service.js";

const server = await (async () => {
  await ensureDefaultMarketplaceCategories();
  return app.listen(env.PORT, () => {
    console.log(`HSello API listening on port ${env.PORT}`);
  });
})().catch(async (error) => {
  console.error("API startup failed", error);
  await prisma.$disconnect();
  process.exit(1);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
