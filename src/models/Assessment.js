import mongoose from "mongoose";

const scoreField = {
  type: Number,
  default: 0,
  min: 0,
  max: 100,
};

const assessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    archetype: {
      type: String,
      required: true,
      trim: true,
      default: "Strategic Visionary",
    },
    domainScores: {
      strategy: scoreField,
      operations: scoreField,
      finance: scoreField,
      leadership: scoreField,
      marketing: scoreField,
    },
    subskillScores: {
      type: Map,
      of: {
        type: Number,
        min: 0,
        max: 100,
      },
      default: {},
    },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    reviewStatus: {
      type: String,
      enum: [
        "PENDING",
        "IN_REVIEW",
        "APPROVED",
        "REQUIRES_FOLLOW_UP",
        "REJECTED",
      ],
      default: "PENDING",
      index: true,
    },
    reviewNotes: { type: String, trim: true, default: "" },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

assessmentSchema.index({
  companyId: 1,
  createdAt: -1,
});

// Find assessments belonging to a particular user
// inside a company.
assessmentSchema.index({
  companyId: 1,
  userId: 1,
  createdAt: -1,
});

// Useful for admin/reviewer dashboards.
assessmentSchema.index({
  companyId: 1,
  reviewStatus: 1,
  createdAt: -1,
});

export default mongoose.model("Assessment", assessmentSchema);
