import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * GET /api/feature-flags
 * Returns feature flag names that are enabled for the current user's role (and tenant).
 */
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const role = req.user!.role;

  const flags = await prisma.featureFlag.findMany({
    where: {
      tenantId,
      enabledRoles: { has: role },
    },
    select: { name: true },
  });

  res.json({
    flags: flags.map((f) => f.name),
  });
});

/**
 * GET /api/feature-flags/all (Admin only)
 * List all feature flags for the tenant with their enabled roles.
 */
router.get("/all", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const flags = await prisma.featureFlag.findMany({
    where: { tenantId },
    select: { id: true, name: true, enabledRoles: true },
    orderBy: { name: "asc" },
  });
  res.json(flags);
});

const createFlagSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, "Snake_case, lowercase"),
  enabledRoles: z.array(z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"])),
});

/**
 * POST /api/feature-flags (Admin only)
 */
router.post("/", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const body = createFlagSchema.parse(req.body);
  const existing = await prisma.featureFlag.findUnique({
    where: { tenantId_name: { tenantId, name: body.name } },
  });
  if (existing) throw new AppError(400, "Feature flag already exists");
  const flag = await prisma.featureFlag.create({
    data: {
      tenantId,
      name: body.name,
      enabledRoles: body.enabledRoles,
    },
  });
  res.status(201).json(flag);
});

const updateFlagSchema = z.object({
  enabledRoles: z.array(z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"])),
});

/**
 * PATCH /api/feature-flags/:id (Admin only)
 */
router.patch("/:id", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const body = updateFlagSchema.parse(req.body);
  const flag = await prisma.featureFlag.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!flag) throw new AppError(404, "Feature flag not found");
  const updated = await prisma.featureFlag.update({
    where: { id: flag.id },
    data: { enabledRoles: body.enabledRoles },
  });
  res.json(updated);
});

/**
 * DELETE /api/feature-flags/:id (Admin only)
 */
router.delete("/:id", authMiddleware, requireRole("ADMIN"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const flag = await prisma.featureFlag.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!flag) throw new AppError(404, "Feature flag not found");
  await prisma.featureFlag.delete({ where: { id: flag.id } });
  res.status(204).send();
});

export { router as featureFlagsRouter };
