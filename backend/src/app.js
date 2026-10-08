import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import studentsRoutes from "./routes/students.routes.js";
import examsRoutes from "./routes/exams.routes.js";
import scriptsRoutes from "./routes/scripts.routes.js";
import evaluationsRoutes from "./routes/evaluations.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import portalRoutes from "./routes/portal.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "digital-exam-evaluation-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentsRoutes);
  app.use("/api/exams", examsRoutes);
  app.use("/api/scripts", scriptsRoutes);
  app.use("/api/evaluations", evaluationsRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/portal", portalRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
