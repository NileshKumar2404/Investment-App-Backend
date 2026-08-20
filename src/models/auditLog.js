import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,

      enum: [
        "AUTH",
        "SECURITY",
        "USER",
        "COMPANY",
        "DOCUMENT",
        "INVESTMENT",
        "WATCHLIST",
        "REPORT",
        "NOTIFICATION",
        "ADMIN",
        "SYSTEM",
      ],

      default: "SYSTEM",
      index: true,
    },

    resourceType: {
      type: String,
      default: "",
      trim: true,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
    },

    success: {
      type: Boolean,
      default: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  companyId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

export default mongoose.model("AuditLog", auditLogSchema);
