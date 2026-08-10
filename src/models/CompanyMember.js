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
      enum: ['OWNER', 'FOUNDER', 'CO_FOUNDER', 'FINANCE', 'ANALYST', 'ADVISOR', 'VIEWER', 'Founder', 'Co-Founder', 'Finance Director', 'Viewer'],
      default: 'VIEWER',
    },
    status: {
      type: String,
      enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED', 'Invited', 'Active', 'Suspended'],
      default: 'ACTIVE',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate team invitations
companyMemberSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CompanyMember', companyMemberSchema);
