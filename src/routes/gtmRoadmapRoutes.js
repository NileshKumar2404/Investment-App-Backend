import express from "express";
import {
  createPersona, listPersonas, updatePersona,
  createChannel, listChannels, updateChannel,
  createRoadmapItem, listRoadmapItems, updateRoadmapItem,
  getGtmSummary, getGtmReadiness,
} from "../controllers/gtmRoadmapController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyPermission } from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();
router.use(protect);
router.use("/:ticker", requireCompanyAccess());

router.post("/:ticker/personas", requireCompanyPermission("CREATE"), createPersona);
router.get("/:ticker/personas", requireCompanyPermission("VIEW"), listPersonas);
router.patch("/:ticker/personas/:personaId", requireCompanyPermission("EDIT"), updatePersona);

router.post("/:ticker/channels", requireCompanyPermission("CREATE"), createChannel);
router.get("/:ticker/channels", requireCompanyPermission("VIEW"), listChannels);
router.patch("/:ticker/channels/:channelId", requireCompanyPermission("EDIT"), updateChannel);

router.post("/:ticker/roadmap-items", requireCompanyPermission("CREATE"), createRoadmapItem);
router.get("/:ticker/roadmap-items", requireCompanyPermission("VIEW"), listRoadmapItems);
router.patch("/:ticker/roadmap-items/:itemId", requireCompanyPermission("EDIT"), updateRoadmapItem);

router.get("/:ticker/summary", requireCompanyPermission("VIEW"), getGtmSummary);
router.get("/:ticker/readiness", requireCompanyPermission("VIEW"), getGtmReadiness);

export default router;
