import mongoose from "mongoose";
import TransactionEntry from "../models/TransactionEntry.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_TRANSACTION_TYPES = ["Revenue", "Expense"];

const ALLOWED_PERIODICITIES = ["One-time", "Monthly", "Quarterly", "Yearly"];

const ALLOWED_EXPENSE_TYPES = ["Fixed", "Variable", "Recurring"];

const ROLES_ALLOWED_TO_DELETE = ["OWNER", "FOUNDER"];
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
// COMPANY VALIDATION HELPER
// ============================================================

const getCompanyFromRequest = (req) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

// ============================================================
// NORMALIZE TRANSACTION TYPE
// ============================================================

const normalizeTransactionType = (type) => {
  const normalized = String(type || "")
    .trim()
    .toLowerCase();

  if (normalized === "revenue") {
    return "Revenue";
  }

  if (normalized === "expense") {
    return "Expense";
  }

  return null;
};

// ============================================================
// NORMALIZE PERIODICITY
// ============================================================

const normalizePeriodicity = (periodicity) => {
  if (
    periodicity === undefined ||
    periodicity === null ||
    String(periodicity).trim() === ""
  ) {
    return "One-time";
  }

  return String(periodicity).trim();
};

// ============================================================
// NORMALIZE EXPENSE TYPE
// ============================================================

const normalizeExpenseType = (expenseType) => {
  if (
    expenseType === undefined ||
    expenseType === null ||
    String(expenseType).trim() === ""
  ) {
    return "Variable";
  }

  return String(expenseType).trim();
};

// ============================================================
// VALIDATE TRANSACTION DATE
// ============================================================

const normalizeTransactionDate = (date) => {
  if (!date) {
    return new Date();
  }

  const transactionDate = new Date(date);

  if (Number.isNaN(transactionDate.getTime())) {
    throw new ApiError(400, "Invalid transaction date.");
  }

  return transactionDate;
};

// ============================================================
// VALIDATE TRANSACTION INPUT
// ============================================================

const validateTransactionInput = ({
  type,
  category,
  amount,
  date,
  periodicity,
  expenseType,
}) => {
  // ----------------------------------------------------------
  // Required fields
  // ----------------------------------------------------------

  if (!type || !category || amount === undefined || amount === null) {
    throw new ApiError(
      400,
      "Transaction type, category, and amount are required.",
    );
  }

  // ----------------------------------------------------------
  // Type
  // ----------------------------------------------------------

  const normalizedType = normalizeTransactionType(type);

  if (!normalizedType) {
    throw new ApiError(400, "Transaction type must be Revenue or Expense.");
  }

  // ----------------------------------------------------------
  // Category
  // ----------------------------------------------------------

  const normalizedCategory = String(category).trim();

  if (!normalizedCategory) {
    throw new ApiError(400, "Transaction category cannot be empty.");
  }

  // ----------------------------------------------------------
  // Amount
  // ----------------------------------------------------------

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new ApiError(400, "Transaction amount must be a valid number.");
  }

  if (numericAmount <= 0) {
    throw new ApiError(400, "Transaction amount must be greater than 0.");
  }

  // ----------------------------------------------------------
  // Periodicity
  // ----------------------------------------------------------

  const normalizedPeriodicity = normalizePeriodicity(periodicity);

  if (!ALLOWED_PERIODICITIES.includes(normalizedPeriodicity)) {
    throw new ApiError(400, "Invalid transaction periodicity.");
  }

  // ----------------------------------------------------------
  // Expense type
  // ----------------------------------------------------------

  const normalizedExpenseType = normalizeExpenseType(expenseType);

  if (!ALLOWED_EXPENSE_TYPES.includes(normalizedExpenseType)) {
    throw new ApiError(400, "Invalid expense type.");
  }

  // ----------------------------------------------------------
  // Date
  // ----------------------------------------------------------

  const transactionDate = normalizeTransactionDate(date);

  return {
    normalizedType,
    normalizedCategory,
    numericAmount,
    normalizedPeriodicity,
    normalizedExpenseType,
    transactionDate,
  };
};

// ============================================================
// GET TRANSACTIONS
// ============================================================

// @desc    Get all transactions for a company
// @route   GET /api/v1/ledger/:ticker
export const getTransactions = asyncHandler(async (req, res) => {
  const company = getCompanyFromRequest(req);

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
        "Ledger transactions retrieved successfully.",
      ),
    );
});

// ============================================================
// ADD TRANSACTION
// ============================================================

// @desc    Add new revenue or expense transaction entry
// @route   POST /api/v1/ledger/:ticker
export const addTransaction = asyncHandler(async (req, res) => {
  const company = getCompanyFromRequest(req);

  const { type, category, amount, date, periodicity, expenseType, notes } =
    req.body;

  // --------------------------------------------------------
  // Validate input
  // --------------------------------------------------------

  const {
    normalizedType,
    normalizedCategory,
    numericAmount,
    normalizedPeriodicity,
    normalizedExpenseType,
    transactionDate,
  } = validateTransactionInput({
    type,
    category,
    amount,
    date,
    periodicity,
    expenseType,
  });

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
      new ApiResponse(201, entry, "Transaction added to ledger successfully."),
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
  // Validate ID
  // --------------------------------------------------------

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid transaction ID.");
  }

  // --------------------------------------------------------
  // Find transaction
  // --------------------------------------------------------

  const entry = await TransactionEntry.findById(id);

  if (!entry) {
    throw new ApiError(404, "Transaction entry not found.");
  }

  // --------------------------------------------------------
  // Verify active membership
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
  // Verify delete permission
  // --------------------------------------------------------

  const role = String(membership.roleOnCompany || "")
    .trim()
    .toUpperCase();

  if (!ROLES_ALLOWED_TO_DELETE.includes(role)) {
    throw new ApiError(
      403,
      "You do not have permission to delete ledger transactions.",
    );
  }

  // --------------------------------------------------------
  // Delete
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
    .json(new ApiResponse(200, null, "Transaction deleted successfully."));
});
