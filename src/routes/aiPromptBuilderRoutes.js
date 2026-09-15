import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import {
  buildPrompt,
  getPromptTypes,
} from "../controllers/aiPromptBuilderController.js";

const router = express.Router();

// Prompt types are static metadata and do not expose company data.
// Keep this endpoint public so the frontend can discover the available
// prompt modes before the user is authenticated.
router.get("/types", getPromptTypes);

router.use(protect);

router.use("/:ticker", requireCompanyAccess());

router.post(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  buildPrompt,
);

export default router;
