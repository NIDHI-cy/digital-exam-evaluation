import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { mapScript } from "../utils/mappers.js";
import { saveUploadedFile, ensureUploadDir } from "../services/storage.service.js";
import { extractSerialFromImage } from "../services/ocr.service.js";
import { logAudit } from "../services/audit.service.js";
import { validateUploadedFile } from "../services/uploadValidation.service.js";
import { env } from "../config/env.js";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
});

router.use(authenticate);

function requireEvaluatorAccess(script, user) {
  if (user.role !== "EVALUATOR") return;
  if (script.assignedToId !== user.id) throw new AppError("Forbidden", 403);
  if (!script.anonymityVerified) throw new AppError("Script identity has not been reviewed by CIR", 403);
}

router.get("/", async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === "EVALUATOR") {
      where.assignedToId = req.user.id;
      where.anonymityVerified = true;
    }

    const scripts = await prisma.answerScript.findMany({
      where,
      include: { exam: true },
      orderBy: { uploadedAt: "desc" },
    });

    const canSeeIdentity = ["ADMIN", "CIR"].includes(req.user.role);
    res.json(scripts.map((s) => mapScript(s, undefined, {
      includeAssignment: req.user.role !== "EVALUATOR",
      includeIdentity: canSeeIdentity,
    })));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({
      where: { id: req.params.id },
      include: { exam: true },
    });
    if (!script) throw new AppError("Script not found", 404);

    requireEvaluatorAccess(script, req.user);

    await logAudit({
      userId: req.user.id,
      action: "SCRIPT_OPENED",
      entityType: "AnswerScript",
      entityId: script.id,
    });

    const canSeeIdentity = ["ADMIN", "CIR"].includes(req.user.role);
    res.json(mapScript(script, undefined, {
      includeAssignment: req.user.role !== "EVALUATOR",
      includeIdentity: canSeeIdentity,
    }));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/mapping", authorize("ADMIN", "CIR"), async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({
      where: { id: req.params.id },
      include: { student: true },
    });
    if (!script) throw new AppError("Script not found", 404);
    res.json({
      scriptId: script.id,
      student: script.student ? {
        id: script.student.id,
        name: script.student.name,
        rollNumber: script.student.rollNumber,
        branch: script.student.branch,
        joiningYear: script.student.joiningYear,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/question-pages", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);
    requireEvaluatorAccess(script, req.user);

    const mappings = await prisma.questionAnswerPageMapping.findMany({
      where: { scriptId: script.id },
      orderBy: { startPage: "asc" },
    });
    res.json(mappings.map(({ questionId, startPage, endPage }) => ({
      questionId,
      startPage,
      endPage,
      pages: Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index),
    })));
  } catch (err) {
    next(err);
  }
});

router.put("/:id/question-pages", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);
    const mappings = z.array(z.object({
      questionId: z.string(),
      startPage: z.number().int().positive(),
      endPage: z.number().int().positive(),
    }).refine((mapping) => mapping.endPage >= mapping.startPage, {
      message: "endPage must be at least startPage",
    })).parse(req.body);

    if (mappings.some((mapping) => mapping.endPage > script.pageCount)) {
      throw new AppError("Mapped answer page is outside this script", 422);
    }
    const questions = await prisma.question.findMany({
      where: { examId: script.examId, id: { in: mappings.map((mapping) => mapping.questionId) } },
      select: { id: true },
    });
    if (questions.length !== mappings.length) {
      throw new AppError("Each mapped question must belong to this script's exam", 422);
    }

    const saved = await prisma.$transaction(mappings.map((mapping) =>
      prisma.questionAnswerPageMapping.upsert({
        where: { scriptId_questionId: { scriptId: script.id, questionId: mapping.questionId } },
        create: { scriptId: script.id, ...mapping },
        update: { startPage: mapping.startPage, endPage: mapping.endPage },
      })
    ));
    await logAudit({
      userId: req.user.id,
      action: "QUESTION_ANSWER_PAGES_MAPPED",
      entityType: "AnswerScript",
      entityId: script.id,
      newValue: mappings,
    });
    res.json(saved.map(({ questionId, startPage, endPage }) => ({ questionId, startPage, endPage })));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/question-paper", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);
    requireEvaluatorAccess(script, req.user);

    const papers = await prisma.questionPaper.findMany({
      where: { examId: script.examId },
      include: { targets: true },
      orderBy: { createdAt: "desc" },
    });
    const questionLinks = await prisma.question.findMany({
      where: { examId: script.examId, questionPaperId: { not: null } },
      select: { questionPaperId: true },
    });
    const linkedPaperIds = new Set(questionLinks.map((question) => question.questionPaperId));
    const paper = papers.find((candidate) =>
      (!linkedPaperIds.size || linkedPaperIds.has(candidate.id)) && (
        !script.branch || candidate.targets.some((target) =>
          target.branch === script.branch &&
          (!script.classSection || target.classSection === script.classSection)
        )
      )
    );
    res.json(paper ? {
      id: paper.id,
      originalName: paper.originalName,
      mimeType: paper.mimeType,
      academicYear: paper.academicYear,
      semester: paper.semester,
      course: paper.course,
      subject: paper.subject,
      fileUrl: `/api/question-papers/${paper.id}/file`,
    } : null);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pages/:pageNumber/file", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);
    requireEvaluatorAccess(script, req.user);

    const pageNumber = Number(req.params.pageNumber);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > script.pageCount) {
      throw new AppError("Answer page not found", 404);
    }
    const page = await prisma.answerScriptPage.findUnique({
      where: { scriptId_pageNumber: { scriptId: script.id, pageNumber } },
    });
    const storedPath = page?.filePath || script.filePath;
    const legacyMimeTypes = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    const mimeType = page?.mimeType || legacyMimeTypes[path.extname(storedPath).toLowerCase()];
    if (!mimeType) throw new AppError("Unsupported stored answer page format", 415);
    const fullPath = path.resolve(env.uploadDir, storedPath);
    if (!fullPath.startsWith(path.resolve(env.uploadDir) + path.sep)) {
      throw new AppError("Invalid stored file path", 500);
    }
    if (!fs.existsSync(fullPath)) throw new AppError("File not found", 404);
    res.type(mimeType).sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/file", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);

    requireEvaluatorAccess(script, req.user);

    const fullPath = path.join(env.uploadDir, script.filePath);
    if (!fs.existsSync(fullPath)) throw new AppError("File not found", 404);

    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/upload",
  authorize("ADMIN", "CIR", "EXAMINER"),
  upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: 20 }]),
  async (req, res, next) => {
    try {
      const uploadedFiles = req.files?.files?.length ? req.files.files : req.files?.file || [];
      const meta = z
        .object({
          examId: z.string(),
          studentId: z.string().optional(),
          pageCount: z.coerce.number().int().positive().optional(),
          assignedToId: z.string().optional(),
          serialNumber: z.string().optional(),
          branch: z.string().optional(),
          classSection: z.string().optional(),
        })
        .parse(req.body);

      if (!uploadedFiles.length) throw new AppError("At least one script page is required", 400);
      const fileTypes = uploadedFiles.map(validateUploadedFile);

      const exam = await prisma.exam.findUnique({ where: { id: meta.examId } });
      if (!exam) throw new AppError("Exam not found", 404);

      const student = meta.studentId
        ? await prisma.student.findUnique({ where: { id: meta.studentId } })
        : null;
      if (meta.studentId && !student) throw new AppError("Student not found", 404);
      const branch = (meta.branch || student?.branch || "").trim().toUpperCase() || null;
      if (student && branch && student.branch !== branch) {
        throw new AppError("Selected branch does not match the student record", 422);
      }

      await ensureUploadDir();
      const pageFiles = await Promise.all(uploadedFiles.map(async (file) => ({
        file,
        filePath: await saveUploadedFile(file, "scripts"),
      })));
      const filePath = pageFiles[0].filePath;
      const pageCount = uploadedFiles.length > 1
        ? uploadedFiles.length
        : (meta.pageCount || 1);

      let serialNumber = meta.serialNumber?.trim() || null;
      let ocrStatus = "MANUAL";
      let ocrRawText = null;

      if (!serialNumber) {
        const ocr = await extractSerialFromImage(filePath);
        ocrRawText = ocr.rawText;
        if (ocr.success && ocr.serialNumber) {
          serialNumber = ocr.serialNumber;
          ocrStatus = "SUCCESS";
        } else {
          ocrStatus = "FAILED";
        }
      }

      if (serialNumber) {
        const existingSerial = await prisma.answerScript.findUnique({
          where: { serialNumber },
        });
        if (existingSerial) {
          serialNumber = `${serialNumber}-${Date.now().toString().slice(-4)}`;
        }
      }

      const script = await prisma.answerScript.create({
        data: {
          examId: meta.examId,
          studentId: student?.id || null,
          branch,
          classSection: meta.classSection?.trim() || null,
          serialNumber,
          filePath,
          pageCount,
          ocrStatus,
          ocrRawText,
          assignedToId: meta.assignedToId || null,
          evaluationStatus: "NOT_STARTED",
        },
        include: { exam: true },
      });

      await prisma.answerScriptPage.createMany({
        data: pageFiles.map(({ file, filePath: storedPath }, index) => ({
          scriptId: script.id,
          pageNumber: index + 1,
          filePath: storedPath,
          originalName: file.originalname,
          mimeType: fileTypes[index].mimeType,
        })),
      });

      await logAudit({
        userId: req.user.id,
        action: "SCRIPT_UPLOADED",
        entityType: "AnswerScript",
        entityId: script.id,
        newValue: { serialNumber: script.serialNumber, ocrStatus },
      });

      res.status(201).json(mapScript(script));
    } catch (err) {
      next(err);
    }
  }
);

router.put("/:id/assign", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const { assignedToId } = z.object({ assignedToId: z.string().nullable().optional() }).parse(req.body);
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);

    if (assignedToId && (!script.serialNumber || script.ocrStatus === "FAILED" || !script.anonymityVerified)) {
      throw new AppError("Review the script serial and verify anonymity before evaluator assignment", 409);
    }

    if (assignedToId) {
      const evaluator = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!evaluator || evaluator.role !== "EVALUATOR") {
        throw new AppError("Selected user is not a valid evaluator", 422);
      }
    }

    const updated = await prisma.answerScript.update({
      where: { id: script.id },
      data: { assignedToId: assignedToId || null },
      include: { exam: true },
    });

    await logAudit({
      userId: req.user.id,
      action: "SCRIPT_ASSIGNED",
      entityType: "AnswerScript",
      entityId: script.id,
      previous: { assignedToId: script.assignedToId },
      newValue: { assignedToId: updated.assignedToId },
    });

    res.json(mapScript(updated));
  } catch (err) {
    next(err);
  }
});

router.put("/:id/anonymity", authorize("ADMIN", "CIR"), async (req, res, next) => {
  try {
    const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);
    if (verified && (!script.serialNumber || script.ocrStatus === "FAILED")) {
      throw new AppError("Correct the failed OCR serial before verifying anonymity", 409);
    }
    const updated = await prisma.answerScript.update({
      where: { id: script.id },
      data: { anonymityVerified: verified },
      include: { exam: true },
    });
    await logAudit({
      userId: req.user.id,
      action: verified ? "SCRIPT_ANONYMITY_VERIFIED" : "SCRIPT_ANONYMITY_REVOKED",
      entityType: "AnswerScript",
      entityId: script.id,
      previous: { anonymityVerified: script.anonymityVerified },
      newValue: { anonymityVerified: verified },
    });
    res.json(mapScript(updated, undefined, {
      includeAssignment: true,
      includeIdentity: ["ADMIN", "CIR"].includes(req.user.role),
    }));
  } catch (err) {
    next(err);
  }
});

router.put("/:id/serial", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const { serialNumber } = z.object({ serialNumber: z.string().regex(/^\d{5,8}$/) }).parse(req.body);
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);

    const conflict = await prisma.answerScript.findFirst({
      where: { serialNumber, NOT: { id: script.id } },
    });
    if (conflict) throw new AppError("Serial number already in use", 409);

    const updated = await prisma.answerScript.update({
      where: { id: script.id },
      data: { serialNumber, ocrStatus: "MANUAL" },
      include: { exam: true },
    });

    await logAudit({
      userId: req.user.id,
      action: "SCRIPT_SERIAL_CORRECTED",
      entityType: "AnswerScript",
      entityId: script.id,
      previous: { serialNumber: script.serialNumber },
      newValue: { serialNumber },
    });

    res.json(mapScript(updated));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reprocess-ocr", authorize("ADMIN", "CIR", "EXAMINER"), async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);

    const ocr = await extractSerialFromImage(script.filePath);
    const data = {
      ocrRawText: ocr.rawText,
      ocrStatus: ocr.success ? "SUCCESS" : "FAILED",
    };
    if (ocr.success && ocr.serialNumber) {
      data.serialNumber = ocr.serialNumber;
    }

    const updated = await prisma.answerScript.update({
      where: { id: script.id },
      data,
      include: { exam: true },
    });

    res.json(mapScript(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
