import mongoose from "mongoose";

const gtmRoadmapItemSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: "GtmPersona", default: null },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "GtmChannel", default: null },
    week: { type: Number, required: true, min: 1, max: 12 },
    title: { type: String, required: true, trim: true },
    objective: { type: String, required: true, trim: true },
    activities: { type: [String], default: [] },
    deliverable: { type: String, default: "", trim: true },
    owner: { type: String, default: "", trim: true },
    status: { type: String, enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "BLOCKED"], default: "PLANNED" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true },
);

gtmRoadmapItemSchema.index({ companyId: 1, week: 1 });

export default mongoose.model("GtmRoadmapItem", gtmRoadmapItemSchema);
