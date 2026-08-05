import TransactionEntry from '../models/TransactionEntry.js';
import Company from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// @desc    Get all transactions for a company
// @route   GET /api/v1/ledger/:ticker
export const getTransactions = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const transactions = await TransactionEntry.find({ companyId: company._id }).sort({ date: -1 });
  return res.status(200).json(new ApiResponse(200, transactions, 'Ledger transactions retrieved successfully'));
});

// @desc    Add new revenue or expense transaction entry
// @route   POST /api/v1/ledger/:ticker
export const addTransaction = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { type, category, amount, date, periodicity, expenseType, notes } = req.body;

  if (!type || !category || amount === undefined) {
    throw new ApiError(400, 'Transaction type, category, and amount are required');
  }

  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const entry = await TransactionEntry.create({
    companyId: company._id,
    type,
    category,
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    periodicity: periodicity || 'One-time',
    expenseType: expenseType || 'Variable',
    notes: notes || '',
  });

  return res.status(201).json(new ApiResponse(201, entry, 'Transaction added to ledger successfully'));
});

// @desc    Delete transaction entry
// @route   DELETE /api/v1/ledger/entry/:id
export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await TransactionEntry.findByIdAndDelete(id);

  if (!entry) {
    throw new ApiError(404, 'Transaction entry not found');
  }

  return res.status(200).json(new ApiResponse(200, null, 'Transaction deleted successfully'));
});
