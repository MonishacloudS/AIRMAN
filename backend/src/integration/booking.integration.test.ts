/**
 * Integration test: booking conflict detection with real DB (tenant-scoped).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hasBookingConflict } from "../services/bookingConflict";

const prisma = new PrismaClient();

let tenantId: string;
let instructorId: string;
let existingBookingId: string;
const bookingDate = new Date("2026-03-01T00:00:00Z");

beforeAll(async () => {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "conflict-test-tenant" },
    update: {},
    create: { name: "Conflict Test Tenant", slug: "conflict-test-tenant" },
  });
  tenantId = tenant.id;
  const hash = await bcrypt.hash("inst123", 10);
  const instructor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "conflict-test-instructor@test.local" } },
    update: {},
    create: {
      tenantId,
      email: "conflict-test-instructor@test.local",
      passwordHash: hash,
      role: "INSTRUCTOR",
      approved: true,
    },
  });
  instructorId = instructor.id;
  const student = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "conflict-test-student@test.local" } },
    update: {},
    create: {
      tenantId,
      email: "conflict-test-student@test.local",
      passwordHash: await bcrypt.hash("stu123", 10),
      role: "STUDENT",
      approved: true,
    },
  });
  const existing = await prisma.booking.create({
    data: {
      tenantId,
      studentId: student.id,
      instructorId,
      status: "ASSIGNED",
      date: bookingDate,
      startTime: "10:00",
      endTime: "11:00",
    },
  });
  existingBookingId = existing.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("Integration: Booking conflict detection", () => {
  it("detects conflict when new slot overlaps existing", async () => {
    const conflict = await hasBookingConflict(tenantId, instructorId, bookingDate, "10:30", "11:30");
    expect(conflict).toBe(true);
  });

  it("no conflict when slot is after existing", async () => {
    const conflict = await hasBookingConflict(tenantId, instructorId, bookingDate, "11:00", "12:00");
    expect(conflict).toBe(false);
  });

  it("no conflict when excluding current booking", async () => {
    const conflict = await hasBookingConflict(
      tenantId,
      instructorId,
      bookingDate,
      "10:00",
      "11:00",
      existingBookingId
    );
    expect(conflict).toBe(false);
  });
});
