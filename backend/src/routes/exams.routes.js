import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { mapExam, mapQuestion } from "../utils/mappers.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const exams = await prisma.exam.findMany({ orderBy: { createdAt: "desc" } });
    res.json(exams.map((e) => mapExam(e)));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { number: "asc" } } },
    });
    if (!exam) throw new AppError("Exam not found", 404);
    res.json(mapExam(exam, { questions: exam.questions.map(mapQuestion) }));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/questions", async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({
      where: { examId: req.params.id },
      orderBy: { number: "asc" },
    });
    if (!questions.length) {
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      if (!exam) throw new AppError("Exam not found", 404);
    }
    res.json(questions.map(mapQuestion));
  } catch (err) {
    next(err);
  }
});

router.post("/", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
  try {
    const body = z
      .object({
        course: z.string(),
        subject: z.string(),
        semester: z.string(),
        academicYear: z.string(),
        examType: z.string(),
        maxMarks: z.number().positive(),
        status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "draft", "active", "closed"]).optional(),
        questions: z
          .array(
            z.object({
              number: z.number().int().positive(),
              text: z.string(),
              maxMarks: z.number().positive(),
              answerKey: z.string(),
              paperPage: z.number().int().positive().optional(),
              questionPaperId: z.string().optional(),
            })
          )
          .optional(),
        evaluatorIds: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const exam = await prisma.exam.create({
      data: {
        course: body.course,
        subject: body.subject,
        semester: body.semester,
        academicYear: body.academicYear,
        examType: body.examType,
        maxMarks: body.maxMarks,
        status: (body.status || "DRAFT").toString().toUpperCase(),
        questions: body.questions
          ? {
              create: body.questions,
            }
          : undefined,
        assignments: body.evaluatorIds?.length
          ? {
              create: body.evaluatorIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: { questions: true },
    });

    await logAudit({
      userId: req.user.id,
      action: "EXAM_CREATED",
      entityType: "Exam",
      entityId: exam.id,
      newValue: mapExam(exam),
    });

    res.status(201).json(mapExam(exam, { questions: exam.questions.map(mapQuestion) }));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
  try {
    const existing = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("Exam not found", 404);

    const body = z
      .object({
        course: z.string().optional(),
        subject: z.string().optional(),
        semester: z.string().optional(),
        academicYear: z.string().optional(),
        examType: z.string().optional(),
        maxMarks: z.number().positive().optional(),
        status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "draft", "active", "closed"]).optional(),
        evaluatorIds: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const data = {};
    for (const key of ["course", "subject", "semester", "academicYear", "examType", "maxMarks"]) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.status) data.status = body.status.toString().toUpperCase();

    const exam = await prisma.exam.update({ where: { id: req.params.id }, data });

    if (body.evaluatorIds) {
      await prisma.examAssignment.deleteMany({ where: { examId: exam.id } });
      if (body.evaluatorIds.length) {
        await prisma.examAssignment.createMany({
          data: body.evaluatorIds.map((userId) => ({ examId: exam.id, userId })),
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: "EXAM_UPDATED",
      entityType: "Exam",
      entityId: exam.id,
      previous: mapExam(existing),
      newValue: mapExam(exam),
    });

    res.json(mapExam(exam));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/questions", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) throw new AppError("Exam not found", 404);

    const questions = z
      .array(
        z.object({
          number: z.number().int().positive(),
          text: z.string(),
          maxMarks: z.number().positive(),
          answerKey: z.string(),
          paperPage: z.number().int().positive().optional(),
          questionPaperId: z.string().optional(),
        })
      )
      .parse(req.body);

    const paperIds = [...new Set(questions.map((question) => question.questionPaperId).filter(Boolean))];
    if (paperIds.length) {
      const papers = await prisma.questionPaper.findMany({
        where: { id: { in: paperIds }, examId: exam.id },
        select: { id: true },
      });
      if (papers.length !== paperIds.length) {
        throw new AppError("Question paper must belong to this exam", 422);
      }
    }

    const created = await prisma.$transaction(
      questions.map((q) =>
        prisma.question.upsert({
          where: { examId_number: { examId: exam.id, number: q.number } },
          create: { examId: exam.id, ...q },
          update: {
            text: q.text,
            maxMarks: q.maxMarks,
            answerKey: q.answerKey,
            paperPage: q.paperPage,
            questionPaperId: q.questionPaperId,
          },
        })
      )
    );

    res.status(201).json(created.map(mapQuestion));
  } catch (err) {
    next(err);
  }
});

export default router;
