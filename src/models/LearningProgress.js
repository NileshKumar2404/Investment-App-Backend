import mongoose from "mongoose";

const learningProgressSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "IN_PROGRESS",
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

learningProgressSchema.index({ companyId: 1, userId: 1, lessonId: 1 }, { unique: true });
learningProgressSchema.index({ companyId: 1, userId: 1, status: 1 });

export default mongoose.model("LearningProgress", learningProgressSchema);
