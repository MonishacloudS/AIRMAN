import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { auditLog } from "../lib/audit";
import { cacheMiddleware } from "../middleware/cache";

const router = Router();
const cache = cacheMiddleware(60 * 1000); // 1 min TTL

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

// List courses (tenant-scoped, paginated, cached)
router.get("/", authMiddleware, cache, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { page, limit, search } = paginationSchema.parse(req.query);
  const where = {
    tenantId,
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, email: true } },
        modules: { select: { id: true, title: true, order: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);
  res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// Get single course (tenant-scoped, cached)
router.get("/:id", authMiddleware, cache, async (req: AuthRequest, res) => {
  const course = await prisma.course.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
    include: {
      instructor: { select: { id: true, email: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, order: true },
          },
        },
      },
    },
  });
  if (!course) throw new AppError(404, "Course not found");
  res.json(course);
});

// Instructor or Admin: create course (tenant-scoped + audit). Admin must pass instructorId.
const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructorId: z.string().optional(),
});

router.post("/", authMiddleware, requireRole("INSTRUCTOR", "ADMIN"), async (req: AuthRequest, res) => {
  const body = createCourseSchema.parse(req.body);
  const tenantId = req.user!.tenantId;
  const role = req.user!.role;
  let instructorId: string;
  if (role === "ADMIN") {
    if (!body.instructorId) throw new AppError(400, "Admin must assign an instructor (instructorId)");
    const instructor = await prisma.user.findFirst({
      where: { id: body.instructorId, tenantId, role: "INSTRUCTOR" },
    });
    if (!instructor) throw new AppError(400, "Instructor not found in this tenant");
    instructorId = body.instructorId;
  } else {
    instructorId = req.user!.id;
  }
  const course = await prisma.course.create({
    data: { title: body.title, description: body.description ?? null, tenantId, instructorId },
    include: { instructor: { select: { id: true, email: true } } },
  });
  await auditLog({
    tenantId,
    userId: req.user!.id,
    action: "course.create",
    resourceType: "course",
    resourceId: course.id,
    afterState: { title: course.title, instructorId },
    correlationId: req.correlationId,
  });
  res.status(201).json(course);
});

// Instructor: create module
const createModuleSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(0).optional(),
});

router.post("/:courseId/modules", authMiddleware, requireRole("INSTRUCTOR", "ADMIN"), async (req: AuthRequest, res) => {
  const { courseId } = req.params;
  const body = createModuleSchema.parse(req.body);
  const tenantId = req.user!.tenantId;
  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId, ...(req.user!.role === "INSTRUCTOR" ? { instructorId: req.user!.id } : {}) },
  });
  if (!course) throw new AppError(404, "Course not found");
  const module_ = await prisma.module.create({
    data: { courseId, title: body.title, order: body.order ?? 0 },
  });
  res.status(201).json(module_);
});

// List modules (tenant-scoped via course)
router.get("/:courseId/modules", authMiddleware, async (req: AuthRequest, res) => {
  const { courseId } = req.params;
  const { page, limit, search } = paginationSchema.parse(req.query);
  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId: req.user!.tenantId },
  });
  if (!course) throw new AppError(404, "Course not found");
  const where = { courseId, ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}) };
  const [items, total] = await Promise.all([
    prisma.module.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { order: "asc" }, include: { lessons: { select: { id: true, title: true, type: true } } } }),
    prisma.module.count({ where }),
  ]);
  res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// Instructor: create lesson (text or quiz)
const createLessonSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["TEXT", "QUIZ"]),
  order: z.number().int().min(0).optional(),
  body: z.string().optional(), // for TEXT
  questions: z.array(z.object({
    prompt: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number().int().min(0),
  })).optional(), // for QUIZ
});

router.post("/:courseId/modules/:moduleId/lessons", authMiddleware, requireRole("INSTRUCTOR", "ADMIN"), async (req: AuthRequest, res) => {
  const { courseId, moduleId } = req.params;
  const body = createLessonSchema.parse(req.body);
  const tenantId = req.user!.tenantId;
  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId, ...(req.user!.role === "INSTRUCTOR" ? { instructorId: req.user!.id } : {}) },
  });
  if (!course) throw new AppError(404, "Course not found");
  const module_ = await prisma.module.findFirst({ where: { id: moduleId, courseId } });
  if (!module_) throw new AppError(404, "Module not found");
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: body.title,
      type: body.type as "TEXT" | "QUIZ",
      order: body.order ?? 0,
    },
  });
  if (body.type === "TEXT" && body.body != null) {
    await prisma.textContent.create({ data: { lessonId: lesson.id, body: body.body } });
  }
  if (body.type === "QUIZ" && body.questions?.length) {
    const quiz = await prisma.quiz.create({ data: { lessonId: lesson.id } });
    await prisma.quizQuestion.createMany({
      data: body.questions.map((q, i) => ({
        quizId: quiz.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        order: i,
      })),
    });
  }
  const full = await prisma.lesson.findUnique({
    where: { id: lesson.id },
    include: { content: true, quiz: { include: { questions: true } } },
  });
  res.status(201).json(full);
});

// Get lesson (tenant-scoped via course -> module -> lesson)
router.get("/lessons/:lessonId", authMiddleware, async (req: AuthRequest, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: {
      content: true,
      quiz: { include: { questions: true } },
      module: { include: { course: true } },
    },
  });
  if (!lesson || lesson.module.course.tenantId !== req.user!.tenantId) {
    throw new AppError(404, "Lesson not found");
  }
  res.json({
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    order: lesson.order,
    content: lesson.content,
    quiz: lesson.quiz,
  });
});

// Submit quiz attempt
const submitQuizSchema = z.object({
  answers: z.array(z.number().int().min(0)), // selected option index per question
});

router.post("/lessons/:lessonId/quiz/attempt", authMiddleware, requireRole("STUDENT"), async (req: AuthRequest, res) => {
  const { lessonId } = req.params;
  const body = submitQuizSchema.parse(req.body);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" } } } },
      module: { include: { course: true } },
    },
  });
  if (!lesson || lesson.type !== "QUIZ" || !lesson.quiz) throw new AppError(404, "Quiz not found");
  if (lesson.module.course.tenantId !== req.user!.tenantId) throw new AppError(404, "Lesson not found");
  const questions = lesson.quiz.questions;
  if (body.answers.length !== questions.length) {
    throw new AppError(400, "Answer count does not match question count");
  }
  let score = 0;
  const incorrect: { questionIndex: number; correctIndex: number; prompt: string }[] = [];
  questions.forEach((q, i) => {
    if (body.answers[i] === q.correctIndex) score++;
    else incorrect.push({ questionIndex: i, correctIndex: q.correctIndex, prompt: q.prompt });
  });
  await prisma.quizAttempt.create({
    data: {
      userId: req.user!.id,
      quizId: lesson.quiz.id,
      answers: body.answers,
      score,
      total: questions.length,
    },
  });
  res.json({ score, total: questions.length, incorrect });
});

// Student: my quiz attempts for a lesson
router.get("/lessons/:lessonId/quiz/attempts", authMiddleware, requireRole("STUDENT"), async (req: AuthRequest, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: { quiz: true, module: { include: { course: true } } },
  });
  if (!lesson || !lesson.quiz) throw new AppError(404, "Quiz not found");
  if (lesson.module.course.tenantId !== req.user!.tenantId) throw new AppError(404, "Lesson not found");
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: lesson.quiz.id, userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(attempts);
});

export { router as coursesRouter };
