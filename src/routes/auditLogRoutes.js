import express from "express";

import { protect } from "../middlewares/authMiddleware.js";
import {
  getAuditLog,
  getAuditLogs,
} from "../controllers/auditLogController.js";

const router = express.Router();

router.use(protect);

router.get("/", getAuditLogs);
router.get("/:id", getAuditLog);

export default router;
