import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
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
    },
    domainScores: {
      strategy: { type: Number, default: 0 },
      operations: { type: Number, default: 0 },
      finance: { type: Number, default: 0 },
      leadership: { type: Number, default: 0 },
      marketing: { type: Number, default: 0 },
    },
    answers: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Assessment', assessmentSchema);
