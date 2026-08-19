import mongoose from "mongoose";
import TransactionEntry from "../models/TransactionEntry.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// ============================================================
// ACTIVITY LOGGER
// ============================================================

const logActivity = async (
  companyId,
  userId,
  action,
  category,
  description,
) => {
  try {
    await CompanyActivity.create({
      companyId,
      userId,
      action,
      category,
      description,
    });
  } catch (error) {
    console.error("Ledger activity log error:", error);
  }
};

// ============================================================
// GET TRANSACTIONS
// ============================================================

// @desc    Get all transactions for a company
// @route   GET /api/v1/ledger/:ticker
export const getTransactions = asyncHandler(async (req, res) => {
  /**
   * companyAuthorization middleware has already:
   *
   * 1. Found the company
   * 2. Verified the user is an ACTIVE member
   * 3. Attached the company to req.company
   */
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const transactions = await TransactionEntry.find({
    companyId: company._id,
  }).sort({
    date: -1,
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        transactions,
        "Ledger transactions retrieved successfully",
      ),
    );
});

// ============================================================
// ADD TRANSACTION
// ============================================================

// @desc    Add new revenue or expense transaction entry
// @route   POST /api/v1/ledger/:ticker
export const addTransaction = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const { type, category, amount, date, periodicity, expenseType, notes } =
    req.body;

  // --------------------------------------------------------
  // Required fields
  // --------------------------------------------------------

  if (!type || !category || amount === undefined || amount === null) {
    throw new ApiError(
      400,
      "Transaction type, category, and amount are required",
    );
  }

  // --------------------------------------------------------
  // Normalize string inputs
  // --------------------------------------------------------

  const normalizedType =
    String(type).trim().toLowerCase() === "revenue"
      ? "Revenue"
      : String(type).trim().toLowerCase() === "expense"
        ? "Expense"
        : null;

  // --------------------------------------------------------
  // Validate transaction type
  // --------------------------------------------------------

  if (!normalizedType) {
    throw new ApiError(400, "Transaction type must be Revenue or Expense");
  }

  // --------------------------------------------------------
  // Validate category
  // --------------------------------------------------------

  const normalizedCategory = String(category).trim();

  if (!normalizedCategory) {
    throw new ApiError(400, "Transaction category cannot be empty");
  }

  // --------------------------------------------------------
  // Validate amount
  // --------------------------------------------------------

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new ApiError(400, "Transaction amount must be a valid number");
  }

  if (numericAmount < 0) {
    throw new ApiError(400, "Transaction amount cannot be negative");
  }

  // --------------------------------------------------------
  // Validate periodicity
  // --------------------------------------------------------

  const allowedPeriodicities = ["One-time", "Monthly", "Quarterly", "Yearly"];

  const normalizedPeriodicity = periodicity
    ? String(periodicity).trim()
    : "One-time";

  if (!allowedPeriodicities.includes(normalizedPeriodicity)) {
    throw new ApiError(400, "Invalid transaction periodicity");
  }

  // --------------------------------------------------------
  // Validate expense type
  // --------------------------------------------------------

  const allowedExpenseTypes = ["Fixed", "Variable", "Recurring"];

  const normalizedExpenseType = expenseType
    ? String(expenseType).trim()
    : "Variable";

  if (!allowedExpenseTypes.includes(normalizedExpenseType)) {
    throw new ApiError(400, "Invalid expense type");
  }

  // --------------------------------------------------------
  // Validate date
  // --------------------------------------------------------

  let transactionDate = new Date();

  if (date) {
    transactionDate = new Date(date);

    if (Number.isNaN(transactionDate.getTime())) {
      throw new ApiError(400, "Invalid transaction date");
    }
  }

  // --------------------------------------------------------
  // Create transaction
  // --------------------------------------------------------

  const entry = await TransactionEntry.create({
    companyId: company._id,

    type: normalizedType,

    category: normalizedCategory,

    amount: numericAmount,

    date: transactionDate,

    periodicity: normalizedPeriodicity,

    expenseType: normalizedExpenseType,

    notes: notes ? String(notes).trim() : "",
  });

  // --------------------------------------------------------
  // Activity log
  // --------------------------------------------------------

  await logActivity(
    company._id,
    req.user._id,
    "LEDGER_TRANSACTION_ADDED",
    "FINANCE",
    `${normalizedType} transaction of ${numericAmount} added to company ledger.`,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, entry, "Transaction added to ledger successfully"),
    );
});

// ============================================================
// DELETE TRANSACTION
// ============================================================

// @desc    Delete transaction entry
// @route   DELETE /api/v1/ledger/entry/:id
export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // --------------------------------------------------------
  // Validate transaction ID
  // --------------------------------------------------------

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid transaction ID");
  }

  // --------------------------------------------------------
  // Find transaction
  // --------------------------------------------------------

  const entry = await TransactionEntry.findById(id);

  if (!entry) {
    throw new ApiError(404, "Transaction entry not found");
  }

  // --------------------------------------------------------
  // Verify active company membership
  // --------------------------------------------------------

  const membership = await CompanyMember.findOne({
    companyId: entry.companyId,

    userId: req.user._id,

    status: "ACTIVE",
  });

  if (!membership) {
    throw new ApiError(403, "You do not have access to this company's ledger.");
  }

  // --------------------------------------------------------
  // Check delete permission
  // --------------------------------------------------------

  const role = String(membership.roleOnCompany).trim().toUpperCase();

  const rolesAllowedToDelete = ["OWNER", "FOUNDER"];

  if (!rolesAllowedToDelete.includes(role)) {
    throw new ApiError(
      403,
      "You do not have permission to delete ledger transactions.",
    );
  }

  // --------------------------------------------------------
  // Delete transaction
  // --------------------------------------------------------

  await TransactionEntry.findByIdAndDelete(entry._id);

  // --------------------------------------------------------
  // Activity log
  // --------------------------------------------------------

  await logActivity(
    entry.companyId,
    req.user._id,
    "LEDGER_TRANSACTION_DELETED",
    "FINANCE",
    `Ledger transaction ${entry._id} was deleted.`,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Transaction deleted successfully"));
});
