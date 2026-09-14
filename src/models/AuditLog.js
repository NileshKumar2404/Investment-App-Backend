import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    statusCode: {
      type: Number,
      min: 100,
      max: 599,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 200,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.pre("save", function (next) {
  if (this.metadata === undefined || this.metadata === null) {
    this.metadata = {};
  }

  next();
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
