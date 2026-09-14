import mongoose from 'mongoose';

const companyActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'IDENTITY',
        'KYC',
        'FINANCIAL',
        'FUNDING',
        'INVESTMENT',
        'TEAM',
        'DOCUMENT',
        'ASSESSMENT',
        'SWOT',
        'PESTLE',
        'MARKETING',
        'WORKFLOW',
      ],
      default: 'WORKFLOW',
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CompanyActivity', companyActivitySchema);
