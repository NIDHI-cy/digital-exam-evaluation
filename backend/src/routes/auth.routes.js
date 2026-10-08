import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { mapLoginResponse, mapUserResponse } from "../utils/mappers.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new AppError("Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
    });

    res.json(mapLoginResponse(user, token));
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await logAudit({
      userId: req.user.id,
      action: "USER_LOGOUT",
      entityType: "User",
      entityId: req.user.id,
    });
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json(mapUserResponse(req.user));
});

router.get("/users", authenticate, authorize("ADMIN", "EXAMINER", "CIR"), async (req, res, next) => {
  try {
    const roleFilter = req.query.role ? String(req.query.role).toUpperCase() : undefined;
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      orderBy: { name: "asc" },
    });

    res.json(users.map(mapUserResponse));
  } catch (err) {
    next(err);
  }
});

export default router;
