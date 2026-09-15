import mongoose from "mongoose";

const gtmPersonaSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    segment: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    painPoints: { type: [String], default: [] },
    buyingMotivations: { type: [String], default: [] },
    objections: { type: [String], default: [] },
    decisionMaker: { type: String, default: "", trim: true },
    marketSize: { type: Number, min: 0, default: 0 },
    problemSeverity: { type: Number, min: 0, max: 100, default: 50 },
    abilityToPay: { type: Number, min: 0, max: 100, default: 50 },
    reachability: { type: Number, min: 0, max: 100, default: 50 },
    strategicFit: { type: Number, min: 0, max: 100, default: 50 },
    priorityScore: { type: Number, min: 0, max: 100, default: 0 },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "TOP"], default: "MEDIUM" },
  },
  { timestamps: true },
);

gtmPersonaSchema.index({ companyId: 1, priorityScore: -1 });

export default mongoose.model("GtmPersona", gtmPersonaSchema);
