import path from "path";
import { AppError } from "../middleware/errorHandler.js";

const SUPPORTED_FILES = {
  ".pdf": { mimeType: "application/pdf", signature: "%PDF-" },
  ".png": { mimeType: "image/png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ".jpg": { mimeType: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  ".jpeg": { mimeType: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
};

export function validateUploadedFile(file) {
  if (!file?.buffer) throw new AppError("file is required", 400);

  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowed = SUPPORTED_FILES[extension];
  if (!allowed || file.mimetype !== allowed.mimeType) {
    throw new AppError("Only matching PDF, PNG, and JPG/JPEG uploads are supported", 415);
  }

  const signatureMatches = typeof allowed.signature === "string"
    ? file.buffer.subarray(0, allowed.signature.length).toString("ascii") === allowed.signature
    : allowed.signature.every((byte, index) => file.buffer[index] === byte);

  if (!signatureMatches) {
    throw new AppError("Uploaded file content does not match its declared type", 415);
  }

  return { extension, mimeType: allowed.mimeType };
}
