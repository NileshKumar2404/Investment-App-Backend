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
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [
        0.01,
        'Amount must be greater than 0.'
      ]
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
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
      trim: true
    },
  },
  { timestamps: true }
);

transactionEntrySchema.index({
  companyId: 1,
  date: -1
})

transactionEntrySchema.index({
  companyId: 1,
  type: 1,
  date: -1
})

transactionEntrySchema.index({
  companyId: 1,
  category: 1
})

export default mongoose.model('TransactionEntry', transactionEntrySchema);
