import mongoose from "mongoose";

const gtmChannelSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    acquisitionMethod: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    expectedCac: { type: Number, min: 0, default: 0 },
    estimatedReach: { type: Number, min: 0, default: 0 },
    conversionExpectation: { type: Number, min: 0, max: 100, default: 0 },
    estimatedCost: { type: Number, min: 0, default: 0 },
    priorityScore: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ["PLANNED", "TESTING", "ACTIVE", "PAUSED", "STOPPED"], default: "PLANNED" },
  },
  { timestamps: true },
);

gtmChannelSchema.index({ companyId: 1, priorityScore: -1 });

export default mongoose.model("GtmChannel", gtmChannelSchema);
