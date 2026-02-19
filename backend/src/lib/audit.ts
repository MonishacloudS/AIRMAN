import { prisma } from "./prisma";

export type AuditAction =
  | "user.login"
  | "user.register"
  | "user.role_change"
  | "course.create"
  | "course.update"
  | "schedule.availability.create"
  | "schedule.availability.delete"
  | "schedule.booking.create"
  | "schedule.booking.approve"
  | "schedule.booking.assign"
  | "schedule.booking.complete"
  | "schedule.booking.cancel"
  | "schedule.booking.escalate";

export async function auditLog(params: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  beforeState?: object;
  afterState?: object;
  correlationId?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      beforeState: params.beforeState != null ? JSON.stringify(params.beforeState) : null,
      afterState: params.afterState != null ? JSON.stringify(params.afterState) : null,
      correlationId: params.correlationId ?? undefined,
    },
  });
}
