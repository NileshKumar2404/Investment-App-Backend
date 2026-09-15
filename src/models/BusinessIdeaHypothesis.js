import mongoose from "mongoose";

const businessIdeaHypothesisSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    statement: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ["CUSTOMER", "PROBLEM", "SOLUTION", "MARKET", "PRICING", "BUSINESS_MODEL", "CHANNEL", "RETENTION"],
      required: true,
    },
    assumption: { type: String, required: true, trim: true, maxlength: 2000 },
    expectedOutcome: { type: String, required: true, trim: true, maxlength: 2000 },
    confidence: { type: Number, min: 0, max: 100, default: 50 },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    status: {
      type: String,
      enum: ["OPEN", "TESTING", "VALIDATED", "REJECTED", "ITERATE", "INCONCLUSIVE"],
      default: "OPEN",
    },
    decision: {
      type: String,
      enum: ["VALIDATE", "ITERATE", "REJECT", "INCONCLUSIVE"],
      default: "INCONCLUSIVE",
    },
    decisionConfidence: { type: Number, min: 0, max: 100, default: 0 },
    decisionRationale: { type: String, default: "" },
    recommendedNextAction: { type: String, default: "" },
  },
  { timestamps: true },
);

businessIdeaHypothesisSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("BusinessIdeaHypothesis", businessIdeaHypothesisSchema);
