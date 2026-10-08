import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { mapScript } from "../utils/mappers.js";
import { saveUploadedFile, ensureUploadDir } from "../services/storage.service.js";
import { extractSerialFromImage, generateAnonymousSerial } from "../services/ocr.service.js";
import { logAudit } from "../services/audit.service.js";
import { env } from "../config/env.js";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === "EVALUATOR") {
      where.assignedToId = req.user.id;
    }

    const scripts = await prisma.answerScript.findMany({
      where,
      include: { exam: true },
      orderBy: { uploadedAt: "desc" },
    });

    res.json(scripts.map((s) => mapScript(s)));
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

    if (req.user.role === "EVALUATOR" && script.assignedToId !== req.user.id) {
      throw new AppError("Forbidden", 403);
    }

    await logAudit({
      userId: req.user.id,
      action: "SCRIPT_OPENED",
      entityType: "AnswerScript",
      entityId: script.id,
    });

    res.json(mapScript(script));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/file", async (req, res, next) => {
  try {
    const script = await prisma.answerScript.findUnique({ where: { id: req.params.id } });
    if (!script) throw new AppError("Script not found", 404);

    if (req.user.role === "EVALUATOR" && script.assignedToId !== req.user.id) {
      throw new AppError("Forbidden", 403);
    }

    const fullPath = path.join(env.uploadDir, script.filePath);
    if (!fs.existsSync(fullPath)) throw new AppError("File not found", 404);

    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/upload",
  authorize("ADMIN", "EXAMINER"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const meta = z
        .object({
          examId: z.string(),
          studentId: z.string().optional(),
          pageCount: z.coerce.number().int().positive().optional(),
          assignedToId: z.string().optional(),
          serialNumber: z.string().optional(),
        })
        .parse(req.body);

      if (!req.file) throw new AppError("file is required", 400);

      const exam = await prisma.exam.findUnique({ where: { id: meta.examId } });
      if (!exam) throw new AppError("Exam not found", 404);

      await ensureUploadDir();
      const filePath = await saveUploadedFile(req.file, "scripts");

      let serialNumber = meta.serialNumber?.trim();
      let ocrStatus = "MANUAL";
      let ocrRawText = null;

      if (!serialNumber) {
        const ocr = await extractSerialFromImage(filePath);
        ocrRawText = ocr.rawText;
        if (ocr.success && ocr.serialNumber) {
          serialNumber = ocr.serialNumber;
          ocrStatus = "SUCCESS";
        } else {
          serialNumber = generateAnonymousSerial();
          ocrStatus = "FAILED";
        }
      }

      const existingSerial = await prisma.answerScript.findUnique({
        where: { serialNumber },
      });
      if (existingSerial) {
        serialNumber = `${serialNumber}-${Date.now().toString().slice(-4)}`;
      }

      const script = await prisma.answerScript.create({
        data: {
          examId: meta.examId,
          studentId: meta.studentId || null,
          serialNumber,
          filePath,
          pageCount: meta.pageCount || 1,
          ocrStatus,
          ocrRawText,
          assignedToId: meta.assignedToId || null,
          evaluationStatus: "NOT_STARTED",
        },
        include: { exam: true },
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

router.put("/:id/serial", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
  try {
    const { serialNumber } = z.object({ serialNumber: z.string().min(3) }).parse(req.body);
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

router.post("/:id/reprocess-ocr", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
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
