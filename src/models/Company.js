import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null, // null for global demo preset companies
    },
    ticker: {
      type: String,
      required: [true, 'Ticker symbol is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    sector: {
      type: String,
      required: [true, 'Sector is required'],
      trim: true,
      default: 'General Industry',
    },
    currentRevenue: { type: Number, required: true, default: 100.0 },
    revenueGrowthRate: { type: Number, required: true, default: 15.0 },
    ebitdaMargin: { type: Number, required: true, default: 20.0 },
    grossMargin: { type: Number, required: true, default: 50.0 },
    cashBalance: { type: Number, required: true, default: 20.0 },
    totalDebt: { type: Number, required: true, default: 10.0 },
    discountRate: { type: Number, required: true, default: 10.0 },
    terminalGrowthRate: { type: Number, required: true, default: 3.0 },
    currentSharePrice: { type: Number, required: true, default: 50.0 },
    sharesOutstanding: { type: Number, required: true, default: 10.0 },

    // Risk Ratings
    financialRisk: { type: Number, default: 25.0 },
    marketRisk: { type: Number, default: 25.0 },
    operationalRisk: { type: Number, default: 25.0 },
    regulatoryRisk: { type: Number, default: 20.0 },
    techRisk: { type: Number, default: 20.0 },

    // Calculated Valuation Fields
    healthScore: { type: Number, default: 0.0 },
    overallRiskScore: { type: Number, default: 0.0 },
    dcfEnterpriseValue: { type: Number, default: 0.0 },
    dcfEquityValue: { type: Number, default: 0.0 },
    fairSharePrice: { type: Number, default: 0.0 },
    priceUpsidePercent: { type: Number, default: 0.0 },
    recommendation: { type: String, default: 'HOLD' },
    recommendationColorHex: { type: String, default: '#F2A93B' },
    projectedRevenues: [{ type: Number }],
    projectedFCF: [{ type: Number }],

    isPreset: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);
