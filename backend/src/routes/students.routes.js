import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  generateRollNumber,
  validateRollNumber,
  isValidBranch,
} from "../services/rollNumber.service.js";
import { mapStudent } from "../utils/mappers.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "EXAMINER", "REVIEWER"), async (req, res, next) => {
  try {
    const { q, branch, joiningYear, status } = req.query;
    const where = {};

    if (branch) where.branch = String(branch).toUpperCase();
    if (joiningYear) where.joiningYear = Number(joiningYear);
    if (status) where.status = String(status).toUpperCase();
    if (q) {
      where.OR = [
        { name: { contains: String(q) } },
        { rollNumber: { contains: String(q).toUpperCase() } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { rollNumber: "asc" },
    });
    res.json(students.map(mapStudent));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authorize("ADMIN", "EXAMINER", "REVIEWER"), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) throw new AppError("Student not found", 404);
    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
});

router.post("/validate-roll", authorize("ADMIN", "EXAMINER"), (req, res, next) => {
  try {
    const { rollNumber } = z.object({ rollNumber: z.string() }).parse(req.body);
    const result = validateRollNumber(rollNumber);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/generate-roll", authorize("ADMIN", "EXAMINER"), (req, res, next) => {
  try {
    const body = z
      .object({
        branch: z.string(),
        joiningYear: z.number().int(),
        rollNumber: z.number().int(),
      })
      .parse(req.body);

    if (!isValidBranch(body.branch)) {
      throw new AppError("Invalid branch code", 422);
    }

    const rollNumber = generateRollNumber(body);
    res.json({ rollNumber, ...validateRollNumber(rollNumber) });
  } catch (err) {
    if (err.message?.includes("Invalid branch") || err.message?.includes("rollNumber")) {
      return next(new AppError(err.message, 422));
    }
    next(err);
  }
});

router.post("/", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        branch: z.string(),
        joiningYear: z.number().int(),
        rollNumber: z.number().int().optional(),
        program: z.string().optional(),
      })
      .parse(req.body);

    if (!isValidBranch(body.branch)) throw new AppError("Invalid branch code", 422);

    const roll =
      body.rollNumber !== undefined
        ? generateRollNumber({
            branch: body.branch,
            joiningYear: body.joiningYear,
            rollNumber: body.rollNumber,
          })
        : null;

    if (!roll) throw new AppError("rollNumber (sequence) is required for generation", 422);

    const existing = await prisma.student.findUnique({ where: { rollNumber: roll } });
    if (existing) throw new AppError("Student with this roll number already exists", 409);

    const student = await prisma.student.create({
      data: {
        name: body.name,
        rollNumber: roll,
        branch: body.branch.toUpperCase(),
        joiningYear: body.joiningYear,
        program: body.program || "UG",
      },
    });

    await logAudit({
      userId: req.user.id,
      action: "STUDENT_CREATED",
      entityType: "Student",
      entityId: student.id,
      newValue: mapStudent(student),
    });

    res.status(201).json(mapStudent(student));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authorize("ADMIN", "EXAMINER"), async (req, res, next) => {
  try {
    const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("Student not found", 404);

    const body = z
      .object({
        name: z.string().min(1).optional(),
        branch: z.string().optional(),
        joiningYear: z.number().int().optional(),
        rollNumber: z.number().int().optional(),
        program: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "active", "inactive"]).optional(),
      })
      .parse(req.body);

    const data = {};
    if (body.name) data.name = body.name;
    if (body.program) data.program = body.program;
    if (body.status) data.status = body.status.toUpperCase();

    if (body.branch || body.joiningYear !== undefined || body.rollNumber !== undefined) {
      const branch = (body.branch || existing.branch).toUpperCase();
      const joiningYear = body.joiningYear ?? existing.joiningYear;
      const seq = body.rollNumber ?? Number(existing.rollNumber.slice(-3));
      data.branch = branch;
      data.joiningYear = joiningYear;
      data.rollNumber = generateRollNumber({ branch, joiningYear, rollNumber: seq });
    }

    const student = await prisma.student.update({ where: { id: req.params.id }, data });

    await logAudit({
      userId: req.user.id,
      action: "STUDENT_UPDATED",
      entityType: "Student",
      entityId: student.id,
      previous: mapStudent(existing),
      newValue: mapStudent(student),
    });

    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try {
    const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("Student not found", 404);

    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" },
    });

    await logAudit({
      userId: req.user.id,
      action: "STUDENT_DEACTIVATED",
      entityType: "Student",
      entityId: student.id,
    });

    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
});

export default router;
