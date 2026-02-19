import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { hasBookingConflict } from "../services/bookingConflict";
import { prisma } from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { rateLimit } from "../middleware/rateLimit";
import { cacheMiddleware } from "../middleware/cache";

const router = Router();
const cache = cacheMiddleware(60 * 1000);

// Rate limit booking mutations (30 per 1 min per IP)
const bookingRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many booking requests" });

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

// Instructor: manage availability (tenant-scoped)
router.get("/availability", authMiddleware, requireRole("INSTRUCTOR"), async (req: AuthRequest, res) => {
  const slots = await prisma.instructorAvailability.findMany({
    where: { tenantId: req.user!.tenantId, instructorId: req.user!.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  res.json(slots);
});

router.post("/availability", authMiddleware, requireRole("INSTRUCTOR"), async (req: AuthRequest, res) => {
  const body = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  }).parse(req.body);
  const tenantId = req.user!.tenantId;
  const slot = await prisma.instructorAvailability.create({
    data: { tenantId, instructorId: req.user!.id, ...body },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "schedule.availability.create",
    resourceType: "instructor_availability",
    resourceId: slot.id,
    afterState: body,
    correlationId: req.correlationId,
  });
  res.status(201).json(slot);
});

router.delete("/availability/:id", authMiddleware, requireRole("INSTRUCTOR"), async (req: AuthRequest, res) => {
  const slot = await prisma.instructorAvailability.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId, instructorId: req.user!.id },
  });
  if (!slot) throw new AppError(404, "Availability slot not found");
  await auditLog({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: "schedule.availability.delete",
    resourceType: "instructor_availability",
    resourceId: slot.id,
    beforeState: { dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime },
    correlationId: req.correlationId,
  });
  await prisma.instructorAvailability.delete({ where: { id: slot.id } });
  res.status(204).send();
});

// Student: create booking request (tenant-scoped)
const createBookingSchema = z.object({
  instructorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: timeSchema,
  endTime: timeSchema,
});

router.post("/bookings", bookingRateLimit, authMiddleware, requireRole("STUDENT"), async (req: AuthRequest, res) => {
  const body = createBookingSchema.parse(req.body);
  const tenantId = req.user!.tenantId;
  const date = new Date(body.date + "T00:00:00Z");
  const booking = await prisma.booking.create({
    data: {
      tenantId,
      studentId: req.user!.id,
      instructorId: body.instructorId ?? null,
      status: "REQUESTED",
      date,
      startTime: body.startTime,
      endTime: body.endTime,
    },
    include: {
      student: { select: { id: true, email: true } },
      instructor: { select: { id: true, email: true } },
    },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "schedule.booking.create",
    resourceType: "booking",
    resourceId: booking.id,
    afterState: { status: "REQUESTED", date: body.date, startTime: body.startTime, endTime: body.endTime },
    correlationId: req.correlationId,
  });
  res.status(201).json(booking);
});

// List bookings (tenant-scoped by role)
router.get("/bookings", authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const role = req.user!.role;
  const weekStart = req.query.weekStart as string | undefined;
  let where: Record<string, unknown> = { tenantId };
  if (role === "STUDENT") where.studentId = req.user!.id;
  if (role === "INSTRUCTOR") where.instructorId = req.user!.id;
  if (weekStart) {
    const start = new Date(weekStart + "T00:00:00Z");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    where.date = { gte: start, lt: end };
  }
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      student: { select: { id: true, email: true } },
      instructor: { select: { id: true, email: true } },
    },
  });
  res.json(bookings);
});

// Admin: approve and assign instructor → status ASSIGNED (workflow: requested → approved → assigned → completed)
const approveBookingSchema = z.object({
  instructorId: z.string(),
});

router.patch("/bookings/:id/approve", bookingRateLimit, authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!booking) throw new AppError(404, "Booking not found");
  if (booking.status !== "REQUESTED") throw new AppError(400, "Booking is not in REQUESTED status");
  const body = approveBookingSchema.parse(req.body);
  const conflict = await hasBookingConflict(
    tenantId,
    body.instructorId,
    booking.date,
    booking.startTime,
    booking.endTime,
    booking.id
  );
  if (conflict) throw new AppError(409, "Instructor has a conflicting booking at this time");
  const before = { status: booking.status, instructorId: booking.instructorId };
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { instructorId: body.instructorId, status: "ASSIGNED" },
    include: {
      student: { select: { id: true, email: true } },
      instructor: { select: { id: true, email: true } },
    },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "schedule.booking.assign",
    resourceType: "booking",
    resourceId: booking.id,
    beforeState: before,
    afterState: { status: "ASSIGNED", instructorId: body.instructorId },
    correlationId: req.correlationId,
  });
  res.json(updated);
});

// Update status: COMPLETED / CANCELLED (tenant-scoped)
router.patch("/bookings/:id/status", bookingRateLimit, authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!booking) throw new AppError(404, "Booking not found");
  const body = z.object({ status: z.enum(["APPROVED", "ASSIGNED", "COMPLETED", "CANCELLED"]) }).parse(req.body);
  const role = req.user!.role;
  const canChange =
    role === "ADMIN" ||
    (role === "INSTRUCTOR" && booking.instructorId === req.user!.id) ||
    (role === "STUDENT" && booking.studentId === req.user!.id);
  if (!canChange) throw new AppError(403, "Cannot update this booking");
  const before = { status: booking.status };
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: body.status },
    include: {
      student: { select: { id: true, email: true } },
      instructor: { select: { id: true, email: true } },
    },
  });
  const action =
    body.status === "COMPLETED"
      ? "schedule.booking.complete"
      : body.status === "CANCELLED"
        ? "schedule.booking.cancel"
        : "schedule.booking.approve";
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action,
    resourceType: "booking",
    resourceId: booking.id,
    beforeState: before,
    afterState: { status: body.status },
    correlationId: req.correlationId,
  });
  res.json(updated);
});

// Weekly calendar (tenant-scoped, cached)
router.get("/calendar", authMiddleware, cache, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const weekStart = (req.query.weekStart as string) || new Date().toISOString().slice(0, 10);
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  let where: Record<string, unknown> = { tenantId, date: { gte: start, lt: end } };
  if (req.user!.role === "STUDENT") where.studentId = req.user!.id;
  if (req.user!.role === "INSTRUCTOR") where.instructorId = req.user!.id;
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      student: { select: { id: true, email: true } },
      instructor: { select: { id: true, email: true } },
    },
  });
  res.json(bookings);
});

export { router as schedulingRouter };
