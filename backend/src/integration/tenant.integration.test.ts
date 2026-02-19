/**
 * Integration tests: tenant isolation.
 * School A cannot access School B data.
 */
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import app from "../index";

const prisma = new PrismaClient();

let tenantA: { id: string };
let tenantB: { id: string };
let adminAToken: string;
let adminBToken: string;
let courseAId: string;

beforeAll(async () => {
  tenantA = await prisma.tenant.upsert({
    where: { slug: "tenant-test-a" },
    update: {},
    create: { name: "School A", slug: "tenant-test-a" },
  });
  tenantB = await prisma.tenant.upsert({
    where: { slug: "tenant-test-b" },
    update: {},
    create: { name: "School B", slug: "tenant-test-b" },
  });
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "admin-a@test.local" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: "admin-a@test.local",
      passwordHash: hash,
      role: "ADMIN",
      approved: true,
    },
  });
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantB.id, email: "admin-b@test.local" } },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: "admin-b@test.local",
      passwordHash: hash,
      role: "ADMIN",
      approved: true,
    },
  });
  const instructorA = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "instr-a@test.local" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: "instr-a@test.local",
      passwordHash: hash,
      role: "INSTRUCTOR",
      approved: true,
    },
  });
  const courseA = await prisma.course.create({
    data: { tenantId: tenantA.id, title: "Course A Only", instructorId: instructorA.id },
  });
  courseAId = courseA.id;

  const loginA = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin-a@test.local", password: "admin123", tenantId: tenantA.id });
  adminAToken = loginA.body.accessToken;
  const loginB = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin-b@test.local", password: "admin123", tenantId: tenantB.id });
  adminBToken = loginB.body.accessToken;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { tenantId: tenantA.id } });
  await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.$disconnect();
});

describe("Tenant isolation", () => {
  it("Admin B cannot see Course A (different tenant)", async () => {
    const res = await request(app)
      .get(`/api/courses/${courseAId}`)
      .set("Authorization", `Bearer ${adminBToken}`);
    expect(res.status).toBe(404);
  });

  it("Admin A can see Course A", async () => {
    const res = await request(app)
      .get(`/api/courses/${courseAId}`)
      .set("Authorization", `Bearer ${adminAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Course A Only");
  });

  it("Admin B list courses returns only School B courses (empty)", async () => {
    const res = await request(app)
      .get("/api/courses")
      .set("Authorization", `Bearer ${adminBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});
