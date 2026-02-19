import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const alpha = await prisma.tenant.upsert({
    where: { slug: "alpha" },
    update: {},
    create: { name: "Alpha Flight School", slug: "alpha" },
  });
  const bravo = await prisma.tenant.upsert({
    where: { slug: "bravo" },
    update: {},
    create: { name: "Bravo Academy", slug: "bravo" },
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const instructorHash = await bcrypt.hash("instructor123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  const adminAlpha = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: alpha.id, email: "admin@alpha.demo" } },
    update: {},
    create: {
      tenantId: alpha.id,
      email: "admin@alpha.demo",
      passwordHash: adminHash,
      role: "ADMIN",
      approved: true,
    },
  });
  const instructorAlpha = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: alpha.id, email: "instructor@alpha.demo" } },
    update: {},
    create: {
      tenantId: alpha.id,
      email: "instructor@alpha.demo",
      passwordHash: instructorHash,
      role: "INSTRUCTOR",
      approved: true,
    },
  });
  const studentAlpha = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: alpha.id, email: "student@alpha.demo" } },
    update: {},
    create: {
      tenantId: alpha.id,
      email: "student@alpha.demo",
      passwordHash: studentHash,
      role: "STUDENT",
      approved: true,
    },
  });

  const adminBravo = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: bravo.id, email: "admin@bravo.demo" } },
    update: {},
    create: {
      tenantId: bravo.id,
      email: "admin@bravo.demo",
      passwordHash: adminHash,
      role: "ADMIN",
      approved: true,
    },
  });
  const instructorBravo = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: bravo.id, email: "instructor@bravo.demo" } },
    update: {},
    create: {
      tenantId: bravo.id,
      email: "instructor@bravo.demo",
      passwordHash: instructorHash,
      role: "INSTRUCTOR",
      approved: true,
    },
  });
  const studentBravo = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: bravo.id, email: "student@bravo.demo" } },
    update: {},
    create: {
      tenantId: bravo.id,
      email: "student@bravo.demo",
      passwordHash: studentHash,
      role: "STUDENT",
      approved: true,
    },
  });

  const courseAlpha = await prisma.course.create({
    data: {
      tenantId: alpha.id,
      title: "Introduction to Flight",
      description: "Core concepts for new pilots.",
      instructorId: instructorAlpha.id,
    },
  });
  const module1 = await prisma.module.create({
    data: { title: "Aerodynamics Basics", order: 0, courseId: courseAlpha.id },
  });
  const textLesson = await prisma.lesson.create({
    data: { title: "Lift and Drag", type: "TEXT", order: 0, moduleId: module1.id },
  });
  await prisma.textContent.create({
    data: {
      lessonId: textLesson.id,
      body: "Lift is the force that opposes weight. Drag opposes thrust. Understanding these four forces is essential for flight.",
    },
  });
  const quizLesson = await prisma.lesson.create({
    data: { title: "Forces Quiz", type: "QUIZ", order: 1, moduleId: module1.id },
  });
  const quiz = await prisma.quiz.create({ data: { lessonId: quizLesson.id } });
  await prisma.quizQuestion.createMany({
    data: [
      { quizId: quiz.id, prompt: "Which force opposes weight?", options: ["Thrust", "Lift", "Drag", "Gravity"], correctIndex: 1, order: 0 },
      { quizId: quiz.id, prompt: "Which force opposes thrust?", options: ["Lift", "Weight", "Drag", "None"], correctIndex: 2, order: 1 },
    ],
  });

  await prisma.instructorAvailability.createMany({
    data: [
      { tenantId: alpha.id, instructorId: instructorAlpha.id, dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      { tenantId: alpha.id, instructorId: instructorAlpha.id, dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
      { tenantId: bravo.id, instructorId: instructorBravo.id, dayOfWeek: 2, startTime: "10:00", endTime: "16:00" },
    ],
  });

  await prisma.featureFlag.createMany({
    data: [
      { tenantId: alpha.id, name: "advanced_analytics", enabledRoles: ["ADMIN", "INSTRUCTOR"] },
      { tenantId: alpha.id, name: "bulk_export", enabledRoles: ["ADMIN"] },
      { tenantId: alpha.id, name: "beta_ui", enabledRoles: ["ADMIN", "INSTRUCTOR", "STUDENT"] },
      { tenantId: bravo.id, name: "advanced_analytics", enabledRoles: ["ADMIN"] },
      { tenantId: bravo.id, name: "beta_ui", enabledRoles: ["ADMIN", "INSTRUCTOR"] },
    ],
  });

  console.log("Seeded tenants: Alpha, Bravo");
  console.log("Alpha: admin@alpha.demo, instructor@alpha.demo, student@alpha.demo / admin123, instructor123, student123");
  console.log("Bravo: admin@bravo.demo, instructor@bravo.demo, student@bravo.demo / same passwords");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
