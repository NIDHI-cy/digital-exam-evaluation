import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

/**
 * Placeholder for approved university portal integration.
 * Does NOT connect to a real portal without institutional API credentials.
 */
const router = Router();

router.post(
  "/transfer-marks/:evaluationId",
  authenticate,
  authorize("ADMIN", "EXAMINER"),
  async (req, res) => {
    res.status(501).json({
      error: "University portal integration is not configured",
      message:
        "This endpoint is reserved for an approved Amrita / university API integration. Configure PORTAL_API_URL and credentials when available.",
      mock: true,
    });
  }
);

export default router;
