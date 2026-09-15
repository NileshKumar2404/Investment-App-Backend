import mongoose from "mongoose";

const dimensionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    rationale: { type: String, required: true },
    evidence: { type: [String], default: [] },
  },
  { _id: false },
);

const startupIdeaAnalysisSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ideaName: { type: String, required: true, trim: true, maxlength: 160 },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    dimensions: {
      type: [dimensionSchema],
      required: true,
      validate: (value) => value.length === 10,
    },
    ideaScore: { type: Number, required: true, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    criticalVulnerabilities: { type: [String], default: [] },
    unansweredQuestions: { type: [String], default: [] },
    immediateNextSteps: { type: [String], default: [] },
    verdict: {
      type: String,
      enum: ["IDEA_NOT_READY", "NEEDS_VALIDATION", "PROMISING", "STRONG_OPPORTUNITY"],
      required: true,
    },
  },
  { timestamps: true },
);

startupIdeaAnalysisSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("StartupIdeaAnalysis", startupIdeaAnalysisSchema);
