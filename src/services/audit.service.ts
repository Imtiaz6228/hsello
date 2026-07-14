import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type AuditDb = Prisma.TransactionClient | PrismaClient;

export type AuditContext = {
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

export async function recordAuditEvent(input: {
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  context?: AuditContext;
}, db: AuditDb = prisma) {
  return db.auditEvent.create({
    data: {
      actorId: input.context?.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      before: input.before,
      after: input.after,
      ipAddress: input.context?.ipAddress,
      userAgent: input.context?.userAgent,
      requestId: input.context?.requestId
    }
  });
}
