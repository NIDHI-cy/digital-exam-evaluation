import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { saveUploadedFile } from "../services/storage.service.js";
import { validateUploadedFile } from "../services/uploadValidation.service.js";
import { isValidBranch } from "../services/rollNumber.service.js";
import { env } from "../config/env.js";
import { logAudit } from "../services/audit.service.js";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(authenticate);

function parseStringArray(value, fieldName) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split(",");
    }
  }

  return z.array(z.string().trim().min(1)).min(1).parse(parsed, {
    path: [fieldName],
  });
}

function mapQuestionPaper(paper) {
  return {
    id: paper.id,
    examId: paper.examId,
    academicYear: paper.academicYear,
    semester: paper.semester,
    examination: paper.examination,
    course: paper.course,
    subject: paper.subject,
    originalName: paper.originalName,
    mimeType: paper.mimeType,
    uploadedAt: paper.createdAt,
    targets: paper.targets.map((target) => ({
      branch: target.branch,
      classSection: target.classSection,
    })),
    fileUrl: `/api/question-papers/${paper.id}/file`,
  };
}

router.get("/", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const examId = req.query.examId ? String(req.query.examId) : undefined;
    const papers = await prisma.questionPaper.findMany({
      where: examId ? { examId } : undefined,
      include: { targets: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(papers.map(mapQuestionPaper));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  authorize("ADMIN", "CIR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const fileType = validateUploadedFile(req.file);
      const body = z.object({
        examId: z.string().min(1),
        academicYear: z.string().trim().min(1),
        semester: z.string().trim().min(1),
        examination: z.string().trim().min(1),
        course: z.string().trim().min(1),
        subject: z.string().trim().min(1),
      }).parse(req.body);
      const branches = parseStringArray(req.body.branches, "branches").map((branch) => branch.toUpperCase());
      const classSections = parseStringArray(req.body.classSections, "classSections");

      if (branches.some((branch) => !isValidBranch(branch))) {
        throw new AppError("One or more branch codes are invalid", 422);
      }

      const exam = await prisma.exam.findUnique({ where: { id: body.examId } });
      if (!exam) throw new AppError("Exam not found", 404);

      const filePath = await saveUploadedFile(req.file, "question-papers");
      const paper = await prisma.questionPaper.create({
        data: {
          ...body,
          uploadedById: req.user.id,
          filePath,
          originalName: req.file.originalname,
          mimeType: fileType.mimeType,
          targets: {
            create: branches.flatMap((branch) => classSections.map((classSection) => ({
              branch,
              classSection,
            }))),
          },
        },
        include: { targets: true },
      });

      await logAudit({
        userId: req.user.id,
        action: "QUESTION_PAPER_UPLOADED",
        entityType: "QuestionPaper",
        entityId: paper.id,
        newValue: { examId: paper.examId, targets: paper.targets },
      });

      res.status(201).json(mapQuestionPaper(paper));
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id/file", async (req, res, next) => {
  try {
    const paper = await prisma.questionPaper.findUnique({
      where: { id: req.params.id },
      include: { targets: true },
    });
    if (!paper) throw new AppError("Question paper not found", 404);

    if (req.user.role === "EVALUATOR") {
      const assignedScript = await prisma.answerScript.findFirst({
        where: { examId: paper.examId, assignedToId: req.user.id, anonymityVerified: true },
      });
      if (!assignedScript) throw new AppError("Forbidden", 403);
      const targetMatches = paper.targets.some((target) =>
        (!assignedScript.branch || target.branch === assignedScript.branch) &&
        (!assignedScript.classSection || target.classSection === assignedScript.classSection)
      );
      if (!targetMatches) throw new AppError("Forbidden", 403);
    } else if (!["ADMIN", "CIR", "EXAMINER"].includes(req.user.role)) {
      throw new AppError("Forbidden", 403);
    }

    const fullPath = path.resolve(env.uploadDir, paper.filePath);
    if (!fullPath.startsWith(path.resolve(env.uploadDir) + path.sep)) {
      throw new AppError("Invalid stored file path", 500);
    }
    if (!fs.existsSync(fullPath)) throw new AppError("File not found", 404);

    res.type(paper.mimeType).sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

export default router;
