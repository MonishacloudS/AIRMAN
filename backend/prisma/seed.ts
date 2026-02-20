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

  // Alpha: 4 courses (each with modules and at least one quiz)
  const courseAlpha1 = await prisma.course.create({
    data: { tenantId: alpha.id, title: "Introduction to Flight", description: "Core concepts for new pilots.", instructorId: instructorAlpha.id },
  });
  const modA1_1 = await prisma.module.create({ data: { title: "Aerodynamics Basics", order: 0, courseId: courseAlpha1.id } });
  const textA1 = await prisma.lesson.create({ data: { title: "Lift and Drag", type: "TEXT", order: 0, moduleId: modA1_1.id } });
  await prisma.textContent.create({ data: { lessonId: textA1.id, body: "Lift opposes weight. Drag opposes thrust. The four forces are essential for flight." } });
  const quizA1 = await prisma.lesson.create({ data: { title: "Forces Quiz", type: "QUIZ", order: 1, moduleId: modA1_1.id } });
  const qA1 = await prisma.quiz.create({ data: { lessonId: quizA1.id } });
  await prisma.quizQuestion.createMany({
    data: [
      { quizId: qA1.id, prompt: "Which force opposes weight?", options: ["Thrust", "Lift", "Drag", "Gravity"], correctIndex: 1, order: 0 },
      { quizId: qA1.id, prompt: "Which force opposes thrust?", options: ["Lift", "Weight", "Drag", "None"], correctIndex: 2, order: 1 },
    ],
  });

  const courseAlpha2 = await prisma.course.create({
    data: { tenantId: alpha.id, title: "Navigation & Instruments", description: "Reading charts and using cockpit instruments.", instructorId: instructorAlpha.id },
  });
  const modA2_1 = await prisma.module.create({ data: { title: "VOR and GPS", order: 0, courseId: courseAlpha2.id } });
  const textA2 = await prisma.lesson.create({ data: { title: "VOR Basics", type: "TEXT", order: 0, moduleId: modA2_1.id } });
  await prisma.textContent.create({ data: { lessonId: textA2.id, body: "VOR (VHF Omnidirectional Range) provides bearing information." } });
  const quizA2Les = await prisma.lesson.create({ data: { title: "Navigation Quiz", type: "QUIZ", order: 1, moduleId: modA2_1.id } });
  const qA2 = await prisma.quiz.create({ data: { lessonId: quizA2Les.id } });
  await prisma.quizQuestion.createMany({ data: [{ quizId: qA2.id, prompt: "VOR operates in which band?", options: ["HF", "VHF", "UHF", "LF"], correctIndex: 1, order: 0 }] });

  const courseAlpha3 = await prisma.course.create({
    data: { tenantId: alpha.id, title: "Weather for Pilots", description: "Reading weather and making go/no-go decisions.", instructorId: instructorAlpha.id },
  });
  const modA3_1 = await prisma.module.create({ data: { title: "Weather Theory", order: 0, courseId: courseAlpha3.id } });
  const textA3 = await prisma.lesson.create({ data: { title: "Fronts and Pressure", type: "TEXT", order: 0, moduleId: modA3_1.id } });
  await prisma.textContent.create({ data: { lessonId: textA3.id, body: "Cold fronts and low pressure systems affect visibility and turbulence." } });

  const courseAlpha4 = await prisma.course.create({
    data: { tenantId: alpha.id, title: "Regulations & Airspace", description: "Part 91 and airspace classes.", instructorId: instructorAlpha.id },
  });
  const modA4_1 = await prisma.module.create({ data: { title: "Airspace", order: 0, courseId: courseAlpha4.id } });
  const quizA4Les = await prisma.lesson.create({ data: { title: "Airspace Quiz", type: "QUIZ", order: 0, moduleId: modA4_1.id } });
  const qA4 = await prisma.quiz.create({ data: { lessonId: quizA4Les.id } });
  await prisma.quizQuestion.createMany({ data: [{ quizId: qA4.id, prompt: "Class A airspace starts at?", options: ["Surface", "1,200 ft AGL", "18,000 ft MSL", "FL600"], correctIndex: 2, order: 0 }] });

  // Bravo: 3 courses
  const courseBravo1 = await prisma.course.create({
    data: { tenantId: bravo.id, title: "Private Pilot Ground", description: "Ground school for PPL.", instructorId: instructorBravo.id },
  });
  const modB1_1 = await prisma.module.create({ data: { title: "Aerodynamics", order: 0, courseId: courseBravo1.id } });
  const textB1 = await prisma.lesson.create({ data: { title: "Four Forces", type: "TEXT", order: 0, moduleId: modB1_1.id } });
  await prisma.textContent.create({ data: { lessonId: textB1.id, body: "Lift, weight, thrust, and drag." } });

  const courseBravo2 = await prisma.course.create({
    data: { tenantId: bravo.id, title: "Cross-Country Planning", description: "Flight planning and fuel.", instructorId: instructorBravo.id },
  });
  const modB2_1 = await prisma.module.create({ data: { title: "Planning", order: 0, courseId: courseBravo2.id } });
  const quizB2Les = await prisma.lesson.create({ data: { title: "Planning Quiz", type: "QUIZ", order: 0, moduleId: modB2_1.id } });
  const qB2 = await prisma.quiz.create({ data: { lessonId: quizB2Les.id } });
  await prisma.quizQuestion.createMany({ data: [{ quizId: qB2.id, prompt: "Reserve fuel (VFR) is typically?", options: ["30 min", "45 min", "1 hour", "No requirement"], correctIndex: 1, order: 0 }] });

  const courseBravo3 = await prisma.course.create({
    data: { tenantId: bravo.id, title: "Radio Communications", description: "ATC phraseology and procedures.", instructorId: instructorBravo.id },
  });
  const modB3_1 = await prisma.module.create({ data: { title: "Phraseology", order: 0, courseId: courseBravo3.id } });
  const textB3 = await prisma.lesson.create({ data: { title: "Standard Phrases", type: "TEXT", order: 0, moduleId: modB3_1.id } });
  await prisma.textContent.create({ data: { lessonId: textB3.id, body: "Use standard ATC phraseology for clarity and safety." } });

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
    skipDuplicates: true,
  });

  console.log("Seeded tenants: Alpha (4 courses), Bravo (3 courses)");
  console.log("Alpha: admin@alpha.demo, instructor@alpha.demo, student@alpha.demo / admin123, instructor123, student123");
  console.log("Bravo: admin@bravo.demo, instructor@bravo.demo, student@bravo.demo / same passwords");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
