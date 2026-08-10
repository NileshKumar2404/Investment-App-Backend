import mongoose from 'mongoose';

const marketingChannelSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    channelName: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
    },
    budget: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'PLANNED'],
      default: 'ACTIVE',
    },
    periodStart: { type: Date },
    periodEnd: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('MarketingChannel', marketingChannelSchema);
