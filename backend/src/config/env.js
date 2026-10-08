import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

export const env = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  uploadDir: path.resolve(
    process.env.UPLOAD_DIR || path.join(__dirname, "../../../uploads")
  ),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
};
