import mongoose from 'mongoose';

const documentSlotSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'PITCH_DECK',
      'BUSINESS_PLAN',
      'BALANCE_SHEET',
      'PROFIT_AND_LOSS',
      'GST_CERTIFICATE',
      'PAN_CARD',
      'COMPANY_REGISTRATION_CERTIFICATE',
      'CERTIFICATE_OF_INCORPORATION',
      'ARTICLES_OF_ASSOCIATION',
      'BANK_STATEMENT',
      'OTHER_CERTIFICATE',
      'Pitch Deck presentation',
      'Audited Financial Statements',
      'GST & Tax Registration Certificate',
      'Articles of Association (AOA)',
    ],
    default: 'OTHER_CERTIFICATE',
  },
  category: { type: String, default: 'General Document' },
  name: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String, default: 'application/pdf' },
  size: { type: String, default: '1.2 MB' },
  status: {
    type: String,
    enum: ['UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'Pending', 'Verified', 'Rejected'],
    default: 'UNDER_REVIEW',
  },
  uploadedAt: { type: Date, default: Date.now },
  uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  verifiedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, default: '' },
});

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roleTitle: { type: String, default: 'Team Member' },
  department: { type: String, default: 'Engineering' },
  experience: { type: String, default: '3+ years' },
  joinedAt: { type: Date, default: Date.now },
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedinUrl: { type: String, default: '' },
  equityPercentage: { type: Number, default: 0.0 },
  reportingTo: { type: String, default: 'CEO' },
  status: { type: String, enum: ['Active', 'Invited', 'Left'], default: 'Active' },
});

const swotItemSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'],
    required: true,
  },
  text: { type: String, required: true },
  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
  },
});

const pestleItemSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECHNOLOGICAL', 'LEGAL', 'ENVIRONMENTAL'],
    required: true,
  },
  description: { type: String, required: true },
  impact: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM',
  },
  influence: {
    type: String,
    enum: ['POSITIVE', 'NEGATIVE'],
    default: 'POSITIVE',
  },
  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
  },
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
    legalStructure: { type: String, default: 'Private Limited' },
    industry: { type: String, default: 'IT & Software' },
    sector: { type: String, default: 'General Industry' },
    foundingYear: { type: Number, default: 2020 },
    dateOfIncorporation: { type: Date },
    website: { type: String, default: '' },
    businessEmail: { type: String, default: '' },
    businessPhone: { type: String, default: '' },
    country: { type: String, default: 'India' },
    city: { type: String, default: 'Bangalore' },

    // Statutory & KYC Registration Numbers
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    cin: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    registeredOfficeAddress: { type: String, default: '' },

    // Founder & Team Details
    founderName: { type: String, default: '' },
    coFounderNames: [{ type: String }],
    headcount: { type: Number, default: 10 },
    businessExperience: { type: String, default: '5+ years' },
    teamMembers: [teamMemberSchema],

    // Business Profile Narrative Descriptions
    productsServices: { type: String, default: '' },
    products: { type: String, default: '' },
    services: { type: String, default: '' },
    operationsDescription: { type: String, default: '' },
    operations: { type: String, default: '' },
    targetAudience: { type: String, default: '' },

    // Financial Profile Inputs
    currentRevenue: { type: Number, required: true, default: 100.0 },
    monthlyExpenses: { type: Number, default: 60.0 },
    assets: { type: Number, default: 150.0 },
    liabilities: { type: Number, default: 40.0 },
    cashFlow: { type: Number, default: 25.0 },
    revenueGrowthRate: { type: Number, required: true, default: 15.0 },
    ebitdaMargin: { type: Number, required: true, default: 20.0 },
    grossMargin: { type: Number, required: true, default: 50.0 },
    cashBalance: { type: Number, required: true, default: 20.0 },
    totalDebt: { type: Number, required: true, default: 10.0 },
    discountRate: { type: Number, required: true, default: 10.0 },
    terminalGrowthRate: { type: Number, required: true, default: 3.0 },
    currentSharePrice: { type: Number, required: true, default: 50.0 },
    sharesOutstanding: { type: Number, required: true, default: 10.0 },

    // Server-Calculated Financials
    netProfit: { type: Number, default: 40.0 },
    profitMargin: { type: Number, default: 40.0 },
    netWorth: { type: Number, default: 110.0 },

    // Funding & Investment Profile
    minInvestment: { type: Number, default: 100000 },
    maxInvestment: { type: Number, default: 1000000 },
    fundingRequired: { type: Number, default: 500000 },
    equityOffered: { type: Number, default: 10.0 },
    valuation: { type: Number, default: 5000000 },
    expectedROI: { type: Number, default: 25.0 },
    valuationSource: {
      type: String,
      enum: ['FOUNDER_DECLARED', 'SYSTEM_CALCULATED', 'ADVISOR_REVIEWED'],
      default: 'FOUNDER_DECLARED',
    },
    valuationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'REVIEWED', 'VERIFIED'],
      default: 'UNVERIFIED',
    },

    // Marketing & Unit Economics Metrics
    marketingBudget: { type: Number, default: 20000 },
    marketingSpend: { type: Number, default: 15000 },
    cac: { type: Number, default: 150.0 },
    ltv: { type: Number, default: 1200.0 },
    ltvCacRatio: { type: Number, default: 8.0 },
    roas: { type: Number, default: 4.5 },
    conversionRate: { type: Number, default: 3.2 },
    tam: { type: Number, default: 10.0 },
    sam: { type: Number, default: 2.5 },
    som: { type: Number, default: 0.5 },

    // Risk Ratings
    financialRisk: { type: Number, default: 25.0 },
    marketRisk: { type: Number, default: 25.0 },
    operationalRisk: { type: Number, default: 25.0 },
    regulatoryRisk: { type: Number, default: 20.0 },
    techRisk: { type: Number, default: 20.0 },

    // Calculated Valuation & Health Metrics
    healthScore: { type: Number, default: 75.0 },
    overallRiskScore: { type: Number, default: 25.0 },
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
      enum: [
        'Draft',
        'Verification Pending',
        'Investment Ready',
        'DRAFT',
        'PROFILE_INCOMPLETE',
        'KYC_PENDING',
        'ASSESSMENT_PENDING',
        'DOCUMENT_REVIEW',
        'INVESTMENT_READY',
        'PUBLISHED',
        'ARCHIVED',
      ],
      default: 'Draft',
    },
    favorite: { type: Boolean, default: false },
    flagged: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    isPreset: { type: Boolean, default: false },

    // Completeness Breakdown
    completeness: {
      profile: { type: Number, default: 80 },
      kyc: { type: Number, default: 75 },
      team: { type: Number, default: 70 },
      business: { type: Number, default: 85 },
      financials: { type: Number, default: 90 },
      funding: { type: Number, default: 60 },
      documents: { type: Number, default: 50 },
      assessment: { type: Number, default: 65 },
      overall: { type: Number, default: 72 },
    },

    // Structured SWOT & PESTLE
    swotItems: [swotItemSchema],
    pestleItems: [pestleItemSchema],

    // Legacy SWOT & PESTLE arrays for backward compatibility
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
