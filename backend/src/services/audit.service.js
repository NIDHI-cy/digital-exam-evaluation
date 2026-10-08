import { prisma } from "../lib/prisma.js";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  previous = null,
  newValue = null,
}) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      previous: previous ? JSON.stringify(previous) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
    },
  });
}
