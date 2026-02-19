import request from "supertest";
import app from "../index";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

jest.mock("../lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const tenantId = "tenant-1";

describe("Auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: tenantId, name: "Test", slug: "test" });
  });

  describe("POST /api/auth/register", () => {
    it("rejects invalid tenant", async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "u@test.com", password: "password123", role: "STUDENT", tenantId: "bad" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid tenant");
    });

    it("rejects duplicate email within tenant", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "1", email: "existing@test.com" });
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "existing@test.com", password: "password123", role: "STUDENT", tenantId });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already registered");
    });

    it("creates user and returns tokens", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "u1",
        email: "new@test.com",
        role: "STUDENT",
        approved: false,
        tenantId,
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "password123", role: "STUDENT", tenantId });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.user.role).toBe("STUDENT");
      expect(res.body.user.approved).toBe(false);
      expect(res.body.user.tenantId).toBe(tenantId);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 401 for invalid credentials", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nope@test.com", password: "wrong", tenantId });
      expect(res.status).toBe(401);
    });

    it("returns 403 for unapproved student", async () => {
      const hash = await bcrypt.hash("pass123", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        email: "student@test.com",
        tenantId,
        passwordHash: hash,
        role: "STUDENT",
        approved: false,
      });
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@test.com", password: "pass123", tenantId });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("pending approval");
    });
  });
});
