import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";

export async function ensureUploadDir() {
  await fs.mkdir(env.uploadDir, { recursive: true });
}

export function resolveStoredPath(relativePath) {
  return path.join(env.uploadDir, relativePath);
}

export async function saveUploadedFile(file, subfolder = "scripts") {
  await ensureUploadDir();
  const dir = path.join(env.uploadDir, subfolder);
  await fs.mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, file.buffer);
  return path.join(subfolder, safeName).replace(/\\/g, "/");
}

export async function readStoredFile(relativePath) {
  return fs.readFile(resolveStoredPath(relativePath));
}
