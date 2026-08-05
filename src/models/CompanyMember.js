import mongoose from 'mongoose';

const companyMemberSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    roleOnCompany: {
      type: String,
      enum: ['Founder', 'Co-Founder', 'Finance Director', 'Viewer'],
      default: 'Viewer',
    },
    status: {
      type: String,
      enum: ['Invited', 'Active', 'Suspended'],
      default: 'Active',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate team invitations
companyMemberSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CompanyMember', companyMemberSchema);
