import mongoose from 'mongoose';

const transactionEntrySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Revenue', 'Expense'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    periodicity: {
      type: String,
      enum: ['One-time', 'Monthly', 'Quarterly', 'Yearly'],
      default: 'One-time',
    },
    expenseType: {
      type: String,
      enum: ['Fixed', 'Variable', 'Recurring'],
      default: 'Variable',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('TransactionEntry', transactionEntrySchema);
