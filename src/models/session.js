import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    deviceId: {
      type: String,
      default: "",
      trim: true,
    },

    deviceName: {
      type: String,
      default: "",
      trim: true,
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

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    revokedReason: {
      type: String,
      default: "",
      trim: true,
    },
  }, { timestamps: true, },
);

sessionSchema.index({
  userId: 1,
  revokedAt: 1,
  expiresAt: 1,
});

sessionSchema.index({
  expiresAt: 1,
});

export default mongoose.model("Session", sessionSchema);