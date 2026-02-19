import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authMiddleware, signAccessToken, signRefreshToken, verifyRefreshToken, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { auditLog } from "../lib/audit";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
  tenantId: z.string().min(1, "Tenant required for registration"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.string().min(1, "Tenant required for login"),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

function tokenPayload(user: { id: string; email: string; role: string; tenantId: string }) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };
}

// Public: list tenants (for login/register dropdown)
router.get("/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  res.json(tenants);
});

// Register
router.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);
  const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId } });
  if (!tenant) throw new AppError(400, "Invalid tenant");

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: body.tenantId, email: body.email } },
  });
  if (existing) throw new AppError(400, "Email already registered for this school");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const approved = body.role === "STUDENT" ? false : true;
  const user = await prisma.user.create({
    data: {
      tenantId: body.tenantId,
      email: body.email,
      passwordHash,
      role: body.role,
      approved,
    },
  });
  const accessToken = signAccessToken(tokenPayload(user));
  const refreshToken = signRefreshToken(tokenPayload(user));
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await auditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: "user.register",
    afterState: { email: user.email, role: user.role },
    correlationId: (req as AuthRequest).correlationId,
  });
  res.status(201).json({
    user: { id: user.id, email: user.email, role: user.role, approved: user.approved, tenantId: user.tenantId },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// Login
router.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId } });
  if (!tenant) throw new AppError(400, "Invalid tenant");

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: body.tenantId, email: body.email } },
  });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }
  if (user.role === "STUDENT" && !user.approved) {
    throw new AppError(403, "Account pending approval");
  }
  const accessToken = signAccessToken(tokenPayload(user));
  const refreshToken = signRefreshToken(tokenPayload(user));
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await auditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: "user.login",
    correlationId: (req as AuthRequest).correlationId,
  });
  res.json({
    user: { id: user.id, email: user.email, role: user.role, approved: user.approved, tenantId: user.tenantId },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// Refresh
router.post("/refresh", async (req, res) => {
  const body = refreshSchema.parse(req.body);
  verifyRefreshToken(body.refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { token: body.refreshToken },
    include: { user: true },
  });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    throw new AppError(401, "Refresh token invalid or expired");
  }
  const user = stored.user;
  const accessToken = signAccessToken(tokenPayload(user));
  res.json({ accessToken, expiresIn: 900 });
});

// Me
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true, approved: true, tenantId: true },
  });
  if (!user) throw new AppError(404, "User not found");
  res.json(user);
});

// Logout
router.post("/logout", authMiddleware, async (req: AuthRequest, res) => {
  const body = z.object({ refreshToken: z.string().optional() }).safeParse(req.body);
  if (body.success && body.data.refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: body.data.refreshToken, userId: req.user!.id } });
  }
  res.json({ ok: true });
});

export { router as authRouter };
