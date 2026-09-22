import express from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from "../controllers/userController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All user management routes require admin or super_admin authentication
router.use(protect);
router.use(authorizeRoles("admin", "super_admin"));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", updateUserStatus);

export default router;
