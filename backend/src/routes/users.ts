import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { auditLog } from "../lib/audit";

const router = Router();

// Admin: create instructor (same tenant)
router.post("/instructors", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const tenantId = req.user!.tenantId;
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: body.email } },
  });
  if (existing) throw new AppError(400, "Email already registered in this school");
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { tenantId, email: body.email, passwordHash, role: "INSTRUCTOR", approved: true },
    select: { id: true, email: true, role: true, approved: true },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "user.role_change",
    resourceType: "user",
    resourceId: user.id,
    afterState: { role: "INSTRUCTOR", email: user.email },
    correlationId: req.correlationId,
  });
  res.status(201).json(user);
});

// Admin: list students (tenant-scoped)
router.get("/students", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const students = await prisma.user.findMany({
    where: { tenantId: req.user!.tenantId, role: "STUDENT" },
    select: { id: true, email: true, approved: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(students);
});

// Admin: approve student (tenant-scoped)
router.patch("/students/:id/approve", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const id = req.params.id;
  const tenantId = req.user!.tenantId;
  const user = await prisma.user.findFirst({ where: { id, tenantId, role: "STUDENT" } });
  if (!user) throw new AppError(404, "Student not found");
  const before = { approved: user.approved };
  const updated = await prisma.user.update({
    where: { id },
    data: { approved: true },
    select: { id: true, email: true, approved: true },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "user.role_change",
    resourceType: "user",
    resourceId: id,
    beforeState: before,
    afterState: { approved: true },
    correlationId: req.correlationId,
  });
  res.json(updated);
});

// List instructors (tenant-scoped)
router.get("/instructors", authMiddleware, requireRole("ADMIN", "INSTRUCTOR", "STUDENT"), async (req: AuthRequest, res) => {
  const instructors = await prisma.user.findMany({
    where: { tenantId: req.user!.tenantId, role: "INSTRUCTOR" },
    select: { id: true, email: true },
  });
  res.json(instructors);
});

export { router as usersRouter };
