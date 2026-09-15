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

router.use(protect);

router.get("/types", getPromptTypes);

router.use("/:ticker", requireCompanyAccess());

router.post(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  buildPrompt,
);

export default router;
