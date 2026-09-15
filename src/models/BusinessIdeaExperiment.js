import mongoose from "mongoose";

const businessIdeaExperimentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    hypothesisId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessIdeaHypothesis", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    objective: { type: String, required: true, trim: true, maxlength: 2000 },
    method: { type: String, required: true, trim: true, maxlength: 2000 },
    targetSample: { type: Number, min: 0, default: 0 },
    successCriteria: { type: String, required: true, trim: true, maxlength: 2000 },
    startDate: { type: Date },
    endDate: { type: Date },
    actualResult: { type: String, default: "", maxlength: 4000 },
    evidence: { type: [String], default: [] },
    evidenceQuality: { type: String, enum: ["NONE", "LOW", "MEDIUM", "HIGH"], default: "NONE" },
    resultStatus: {
      type: String,
      enum: ["PLANNED", "SUCCESS", "FAILURE", "INCONCLUSIVE"],
      default: "PLANNED",
    },
  },
  { timestamps: true },
);

businessIdeaExperimentSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("BusinessIdeaExperiment", businessIdeaExperimentSchema);
