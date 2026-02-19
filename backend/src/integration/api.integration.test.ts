/**
 * Integration tests hitting real DB (use test DB via DATABASE_URL).
 * Run with: npm run test -- --testPathPattern=integration
 */
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../index";

const prisma = new PrismaClient();

let tenantId: string;
const testUser = {
  email: "integration-student@test.local",
  password: "integration123",
  role: "STUDENT" as const,
};

beforeAll(async () => {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "integration-test-tenant" },
    update: {},
    create: { name: "Integration Test Tenant", slug: "integration-test-tenant" },
  });
  tenantId = tenant.id;
  await prisma.quizAttempt.deleteMany({ where: { user: { tenantId, email: testUser.email } } });
  await prisma.booking.deleteMany({ where: { student: { tenantId, email: testUser.email } } });
  await prisma.user.deleteMany({ where: { tenantId, email: testUser.email } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { tenantId, email: testUser.email } });
  await prisma.$disconnect();
});

describe("Integration: Auth and RBAC", () => {
  let accessToken: string;

  it("registers a student and gets tokens", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: testUser.email, password: testUser.password, role: "STUDENT", tenantId });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.tenantId).toBe(tenantId);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it("GET /api/auth/me returns user when authenticated", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.role).toBe("STUDENT");
    expect(res.body.tenantId).toBe(tenantId);
  });

  it("GET /api/users/instructors without auth returns 401", async () => {
    const res = await request(app).get("/api/users/instructors");
    expect(res.status).toBe(401);
  });

  it("GET /api/users/instructors with student token returns 200", async () => {
    const res = await request(app)
      .get("/api/users/instructors")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
