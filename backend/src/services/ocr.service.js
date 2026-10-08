import Tesseract from "tesseract.js";
import { readStoredFile } from "./storage.service.js";

const SERIAL_PATTERNS = [
  /SERIAL[:\s#-]*(\d{5,8})/i,
  /\b(\d{6})\b/,
  /SN[:\s#-]*(\d{5,8})/i,
];

export function sanitizeSerialNumber(value) {
  const normalized = String(value ?? "").trim();
  return /^\d{5,8}$/.test(normalized) ? normalized : null;
}

export async function extractSerialFromImage(relativePath) {
  try {
    const buffer = await readStoredFile(relativePath);
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: () => {},
    });

    const cleaned = text.replace(/\s+/g, " ").trim();
    for (const pattern of SERIAL_PATTERNS) {
      const match = cleaned.match(pattern);
      const serialNumber = sanitizeSerialNumber(match?.[1]);
      if (serialNumber) {
        return { serialNumber, rawText: cleaned, success: true };
      }
    }

    return { serialNumber: null, rawText: cleaned, success: false };
  } catch (err) {
    return { serialNumber: null, rawText: null, success: false, error: err.message };
  }
}

export function generateAnonymousSerial() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
