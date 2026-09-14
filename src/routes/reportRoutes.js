import express from "express";
import {
    getCompanyReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific report routes must come before /:ticker.
router.get(
    "/report/:id",
    protect,
    getReport,
);

router.patch(
    "/report/:id",
    protect,
    updateReport,
);

router.delete(
    "/report/:id",
    protect,
    deleteReport,
);

router.get(
    "/:ticker",
    protect,
    getCompanyReports,
);

router.post(
    "/:ticker",
    protect,
    createReport,
);

export default router;
