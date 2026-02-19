import { prisma } from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { sendEmailStub } from "../lib/emailStub";

const ESCALATION_HOURS = Number(process.env.BOOKING_ESCALATION_HOURS) || 24;

/**
 * Find REQUESTED bookings with no instructor assigned, older than ESCALATION_HOURS,
 * set escalatedAt, write audit log, and send email stub to admins.
 * Safe to run repeatedly (idempotent: only escalates if escalatedAt is null).
 */
export async function runEscalationJob(): Promise<{ escalated: number }> {
  const cutoff = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000);
  const toEscalate = await prisma.booking.findMany({
    where: {
      status: "REQUESTED",
      escalatedAt: null,
      createdAt: { lt: cutoff },
    },
    include: {
      tenant: true,
      student: { select: { email: true } },
    },
  });

  let escalated = 0;
  for (const b of toEscalate) {
    await prisma.booking.update({
      where: { id: b.id },
      data: { escalatedAt: new Date() },
    });
    await auditLog({
      tenantId: b.tenantId,
      userId: b.studentId, // actor for audit; in reality "system"
      action: "schedule.booking.escalate",
      resourceType: "booking",
      resourceId: b.id,
      afterState: { escalatedAt: new Date().toISOString(), reason: "Unassigned within X hours" },
    });
    const admins = await prisma.user.findMany({
      where: { tenantId: b.tenantId, role: "ADMIN" },
      select: { email: true },
    });
    for (const admin of admins) {
      sendEmailStub({
        to: admin.email,
        subject: `[AIRMAN] Booking escalation: ${b.id}`,
        body: `Booking ${b.id} (student: ${b.student.email}) has been unassigned for more than ${ESCALATION_HOURS}h. Please assign an instructor.`,
      });
    }
    escalated++;
  }
  return { escalated };
}
