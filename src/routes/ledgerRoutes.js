import express from "express";

import {
  getTransactions,
  addTransaction,
  deleteTransaction,
} from "../controllers/ledgerController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

// ============================================================
// GET COMPANY LEDGER
// ============================================================

// GET /api/v1/ledger/:ticker
//
// Required:
// - Valid access token
// - Active company membership
// - VIEW permission

router.get(
  "/:ticker",
  protect,
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getTransactions,
);

// ============================================================
// ADD LEDGER TRANSACTION
// ============================================================

// POST /api/v1/ledger/:ticker
//
// Required:
// - Valid access token
// - Active company membership
// - CREATE permission

router.post(
  "/:ticker",
  protect,
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  addTransaction,
);

// ============================================================
// DELETE LEDGER TRANSACTION
// ============================================================

// DELETE /api/v1/ledger/entry/:id
//
// Authentication is required.
//
// The controller additionally verifies:
// - User belongs to the transaction's company
// - Membership is ACTIVE
// - User has OWNER/FOUNDER role

router.delete("/entry/:id", protect, deleteTransaction);

export default router;
