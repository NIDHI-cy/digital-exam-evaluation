import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { mapEvaluation } from "../utils/mappers.js";
import {
  validateMarksAgainstQuestions,
  canTransition,
  parseMarksJson,
} from "../services/evaluationValidation.service.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);

async function getScriptForUser(scriptId, user) {
  const script = await prisma.answerScript.findUnique({
    where: { id: scriptId },
    include: { exam: { include: { questions: { orderBy: { number: "asc" } } } } },
  });
  if (!script) throw new AppError("Script not found", 404);

  if (user.role === "EVALUATOR" && script.assignedToId !== user.id) {
    throw new AppError("Forbidden", 403);
  }
  return script;
}

router.get("/", authorize("ADMIN", "REVIEWER", "EXAMINER"), async (req, res, next) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      include: { script: { include: { exam: true } }, evaluator: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(
      evaluations.map((e) => ({
        ...mapEvaluation(e),
        evaluator: { id: e.evaluator.id, name: e.evaluator.name, email: e.evaluator.email },
        script: { id: e.script.id, serialNumber: e.script.serialNumber },
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:scriptId", async (req, res, next) => {
  try {
    const script = await getScriptForUser(req.params.scriptId, req.user);
    let evaluation = await prisma.evaluation.findUnique({
      where: { scriptId: script.id },
    });

    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          scriptId: script.id,
          evaluatorId: req.user.id,
          marksJson: "{}",
          totalMarks: 0,
          status: "NOT_STARTED",
        },
      });
    }

    res.json(mapEvaluation(evaluation, script.id));
  } catch (err) {
    next(err);
  }
});

router.put("/:scriptId", authorize("EVALUATOR", "EXAMINER", "ADMIN"), async (req, res, next) => {
  try {
    const script = await getScriptForUser(req.params.scriptId, req.user);
    const { marks } = z.object({ marks: z.record(z.any()) }).parse(req.body);

    let evaluation = await prisma.evaluation.findUnique({ where: { scriptId: script.id } });
    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          scriptId: script.id,
          evaluatorId: req.user.id,
          marksJson: "{}",
          totalMarks: 0,
          status: "NOT_STARTED",
        },
      });
    }

    if (evaluation.status === "SUBMITTED" || evaluation.status === "REVIEWED") {
      throw new AppError("Submitted evaluation cannot be edited", 409);
    }

    const validation = validateMarksAgainstQuestions(script.exam.questions, marks);
    if (!validation.isValid) {
      throw new AppError("Validation failed", 422, validation.errors);
    }

    const nextStatus =
      evaluation.status === "NOT_STARTED" ? "IN_PROGRESS" : evaluation.status === "IN_PROGRESS" ? "COMPLETED" : "COMPLETED";

    if (!canTransition(evaluation.status, nextStatus)) {
      throw new AppError("Invalid status transition", 409);
    }

    const updated = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: {
        marksJson: JSON.stringify(marks),
        totalMarks: validation.total,
        status: nextStatus,
        evaluatorId: req.user.id,
      },
    });

    await prisma.answerScript.update({
      where: { id: script.id },
      data: {
        evaluationStatus: nextStatus === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    await logAudit({
      userId: req.user.id,
      action: "EVALUATION_SAVED",
      entityType: "Evaluation",
      entityId: updated.id,
      newValue: { marks, total: validation.total, status: nextStatus },
    });

    res.json(mapEvaluation(updated, script.id));
  } catch (err) {
    next(err);
  }
});

router.post("/:scriptId/submit", authorize("EVALUATOR", "EXAMINER", "ADMIN"), async (req, res, next) => {
  try {
    const script = await getScriptForUser(req.params.scriptId, req.user);
    const { marks } = z.object({ marks: z.record(z.any()) }).parse(req.body);

    let evaluation = await prisma.evaluation.findUnique({ where: { scriptId: script.id } });
    if (!evaluation) {
      throw new AppError("Evaluation not found", 404);
    }

    if (evaluation.status === "SUBMITTED" || evaluation.status === "REVIEWED") {
      throw new AppError("Already submitted", 409);
    }

    const validation = validateMarksAgainstQuestions(script.exam.questions, marks);
    if (!validation.isComplete || !validation.isValid) {
      throw new AppError("Complete all marks before submit", 422, validation.errors);
    }

    if (!canTransition(evaluation.status, "SUBMITTED")) {
      throw new AppError("Invalid status transition", 409);
    }

    const updated = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: {
        marksJson: JSON.stringify(marks),
        totalMarks: validation.total,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    await prisma.answerScript.update({
      where: { id: script.id },
      data: { evaluationStatus: "SUBMITTED" },
    });

    await logAudit({
      userId: req.user.id,
      action: "EVALUATION_SUBMITTED",
      entityType: "Evaluation",
      entityId: updated.id,
      newValue: { total: validation.total, status: "SUBMITTED" },
    });

    res.json(mapEvaluation(updated, script.id));
  } catch (err) {
    next(err);
  }
});

router.post("/:scriptId/review", authorize("REVIEWER", "ADMIN"), async (req, res, next) => {
  try {
    const script = await getScriptForUser(req.params.scriptId, req.user);
    const evaluation = await prisma.evaluation.findUnique({ where: { scriptId: script.id } });
    if (!evaluation) throw new AppError("Evaluation not found", 404);
    if (evaluation.status !== "SUBMITTED") {
      throw new AppError("Only submitted evaluations can be reviewed", 409);
    }

    const updated = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { status: "REVIEWED" },
    });

    await prisma.answerScript.update({
      where: { id: script.id },
      data: { evaluationStatus: "REVIEWED" },
    });

    await logAudit({
      userId: req.user.id,
      action: "EVALUATION_REVIEWED",
      entityType: "Evaluation",
      entityId: updated.id,
    });

    res.json(mapEvaluation(updated, script.id));
  } catch (err) {
    next(err);
  }
});

router.get("/:scriptId/status", async (req, res, next) => {
  try {
    const script = await getScriptForUser(req.params.scriptId, req.user);
    const evaluation = await prisma.evaluation.findUnique({ where: { scriptId: script.id } });
    res.json({
      scriptId: script.id,
      scriptStatus: script.evaluationStatus,
      evaluation: evaluation ? mapEvaluation(evaluation, script.id) : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
