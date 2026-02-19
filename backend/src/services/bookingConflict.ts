import { prisma } from "../lib/prisma";

/**
 * Check if a time slot conflicts with existing approved/completed bookings for the same instructor on the same date.
 * Returns true if there is a conflict (double-book).
 */
export async function hasBookingConflict(
  tenantId: string,
  instructorId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const overlapping = await prisma.booking.findFirst({
    where: {
      tenantId,
      instructorId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["APPROVED", "ASSIGNED", "COMPLETED"] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  return !!overlapping;
}

export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}
