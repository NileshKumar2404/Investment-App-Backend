import mongoose from 'mongoose';

const documentSlotSchema = new mongoose.Schema({
  category: { type: String, required: true }, // Pitch Deck, Business Plan, Financial Statements, GST, PAN, etc.
  name: { type: String, required: true },
  fileUrl: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  uploadedAt: { type: Date, default: Date.now },
});

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
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
    logo: { type: String, default: '' },
    structure: { type: String, default: 'Private Limited' },
    industry: { type: String, default: 'IT & Software' },
    sector: { type: String, default: 'General Industry' },
    foundingYear: { type: Number, default: 2020 },
    country: { type: String, default: 'India' },
    city: { type: String, default: 'Bangalore' },

    // Statutory & KYC Registration Numbers
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    cin: { type: String, default: '' },
    registeredAddress: { type: String, default: '' },

    // Founder & Team Details
    founderName: { type: String, default: '' },
    coFounderNames: [{ type: String }],
    headcount: { type: Number, default: 10 },

    // Business Profile Narrative Descriptions
    productsServices: { type: String, default: '' },
    operationsDescription: { type: String, default: '' },
    targetAudience: { type: String, default: '' },

    // Financial Inputs
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

    // Calculated Valuation & Health Metrics
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

    // Status Workflow Flags
    status: {
      type: String,
      enum: ['Draft', 'Verification Pending', 'Investment Ready'],
      default: 'Draft',
    },
    favorite: { type: Boolean, default: false },
    flagged: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    isPreset: { type: Boolean, default: false },

    // SWOT & PESTLE Strategic Analysis Arrays
    swot: {
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      opportunities: [{ type: String }],
      threats: [{ type: String }],
    },
    pestle: {
      political: [{ type: String }],
      economic: [{ type: String }],
      social: [{ type: String }],
      technological: [{ type: String }],
      legal: [{ type: String }],
      environmental: [{ type: String }],
    },

    // Documents
    documents: [documentSlotSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);
