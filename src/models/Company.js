import mongoose from "mongoose";

// ============================================================
// DOCUMENT SLOT SCHEMA
// ============================================================

const documentSlotSchema = new mongoose.Schema(
  {
    type: {
      type: String,

      enum: [
        "PITCH_DECK",
        "BUSINESS_PLAN",
        "BALANCE_SHEET",
        "PROFIT_AND_LOSS",
        "GST_CERTIFICATE",
        "PAN_CARD",
        "COMPANY_REGISTRATION_CERTIFICATE",
        "CERTIFICATE_OF_INCORPORATION",
        "ARTICLES_OF_ASSOCIATION",
        "BANK_STATEMENT",
        "OTHER_CERTIFICATE",

        // Legacy document names
        "Pitch Deck presentation",
        "Audited Financial Statements",
        "GST & Tax Registration Certificate",
        "Articles of Association (AOA)",
      ],

      default: "OTHER_CERTIFICATE",
    },

    category: {
      type: String,
      default: "General Document",
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Kept for backward compatibility.
     *
     * New document uploads should use the
     * separate Document collection and should
     * not rely on this field for authorization.
     */
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      default: "application/pdf",
      trim: true,
    },

    /**
     * Legacy field.
     *
     * Existing frontend data may contain values
     * such as "1.2 MB".
     */
    size: {
      type: String,
      default: "1.2 MB",
      trim: true,
    },

    status: {
      type: String,

      enum: [
        "UPLOADED",
        "UNDER_REVIEW",
        "VERIFIED",
        "REJECTED",

        // Legacy values
        "Pending",
        "Verified",
        "Rejected",
      ],

      default: "UNDER_REVIEW",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: {
      type: Date,
    },

    verifiedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: true,
  },
);

// ============================================================
// TEAM MEMBER SCHEMA
// ============================================================

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    roleTitle: {
      type: String,
      default: "Team Member",
      trim: true,
    },

    department: {
      type: String,
      default: "Engineering",
      trim: true,
    },

    experience: {
      type: String,
      default: "3+ years",
      trim: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
    },

    equityPercentage: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 100,
    },

    reportingTo: {
      type: String,
      default: "CEO",
      trim: true,
    },

    status: {
      type: String,

      enum: ["Active", "Invited", "Left"],

      default: "Active",
    },
  },
  {
    _id: true,
  },
);

// ============================================================
// SWOT ITEM SCHEMA
// ============================================================

const swotItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,

      enum: ["STRENGTH", "WEAKNESS", "OPPORTUNITY", "THREAT"],

      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,

      enum: ["HIGH", "MEDIUM", "LOW"],

      default: "MEDIUM",
    },
  },
  {
    _id: true,
  },
);

// ============================================================
// PESTLE ITEM SCHEMA
// ============================================================

const pestleItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,

      enum: [
        "POLITICAL",
        "ECONOMIC",
        "SOCIAL",
        "TECHNOLOGICAL",
        "LEGAL",
        "ENVIRONMENTAL",
      ],

      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    impact: {
      type: String,

      enum: ["LOW", "MEDIUM", "HIGH"],

      default: "MEDIUM",
    },

    influence: {
      type: String,

      enum: ["POSITIVE", "NEGATIVE"],

      default: "POSITIVE",
    },

    priority: {
      type: String,

      enum: ["HIGH", "MEDIUM", "LOW"],

      default: "MEDIUM",
    },
  },
  {
    _id: true,
  },
);

// ============================================================
// COMPANY SCHEMA
// ============================================================

const companySchema = new mongoose.Schema(
  {
    // ========================================================
    // LEGACY / PRIMARY USER REFERENCE
    // ========================================================

    /**
     * Kept for backward compatibility.
     *
     * Company access must NOT be determined
     * using this field.
     *
     * CompanyMember is the source of truth for
     * company membership and authorization.
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },

    // ========================================================
    // BASIC COMPANY INFORMATION
    // ========================================================

    ticker: {
      type: String,

      required: [true, "Ticker symbol is required"],

      uppercase: true,
      trim: true,
    },

    companyName: {
      type: String,

      required: [true, "Company name is required"],

      trim: true,
    },

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    structure: {
      type: String,
      default: "Private Limited",
      trim: true,
    },

    legalStructure: {
      type: String,
      default: "Private Limited",
      trim: true,
    },

    industry: {
      type: String,
      default: "IT & Software",
      trim: true,
    },

    sector: {
      type: String,
      default: "General Industry",
      trim: true,
    },

    foundingYear: {
      type: Number,
      default: 2020,
    },

    dateOfIncorporation: {
      type: Date,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    businessEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    businessPhone: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    city: {
      type: String,
      default: "Bangalore",
      trim: true,
    },

    // ========================================================
    // STATUTORY & KYC
    // ========================================================

    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    pan: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    cin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    registrationNumber: {
      type: String,
      default: "",
      trim: true,
    },

    registeredOfficeAddress: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // FOUNDER & TEAM
    // ========================================================

    founderName: {
      type: String,
      default: "",
      trim: true,
    },

    coFounderNames: [
      {
        type: String,
        trim: true,
      },
    ],

    headcount: {
      type: Number,
      default: 10,
      min: 0,
    },

    businessExperience: {
      type: String,
      default: "5+ years",
      trim: true,
    },

    teamMembers: [teamMemberSchema],

    // ========================================================
    // BUSINESS PROFILE
    // ========================================================

    productsServices: {
      type: String,
      default: "",
      trim: true,
    },

    products: {
      type: String,
      default: "",
      trim: true,
    },

    services: {
      type: String,
      default: "",
      trim: true,
    },

    operationsDescription: {
      type: String,
      default: "",
      trim: true,
    },

    operations: {
      type: String,
      default: "",
      trim: true,
    },

    targetAudience: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // FINANCIAL PROFILE INPUTS
    // ========================================================

    currentRevenue: {
      type: Number,
      required: true,
      default: 100.0,
    },

    monthlyExpenses: {
      type: Number,
      default: 60.0,
    },

    assets: {
      type: Number,
      default: 150.0,
    },

    liabilities: {
      type: Number,
      default: 40.0,
    },

    cashFlow: {
      type: Number,
      default: 25.0,
    },

    revenueGrowthRate: {
      type: Number,
      required: true,
      default: 15.0,
    },

    ebitdaMargin: {
      type: Number,
      required: true,
      default: 20.0,
    },

    grossMargin: {
      type: Number,
      required: true,
      default: 50.0,
    },

    cashBalance: {
      type: Number,
      required: true,
      default: 20.0,
    },

    totalDebt: {
      type: Number,
      required: true,
      default: 10.0,
    },

    discountRate: {
      type: Number,
      required: true,
      default: 10.0,
    },

    terminalGrowthRate: {
      type: Number,
      required: true,
      default: 3.0,
    },

    currentSharePrice: {
      type: Number,
      required: true,
      default: 50.0,
    },

    sharesOutstanding: {
      type: Number,
      required: true,
      default: 10.0,
    },

    // ========================================================
    // SERVER-CALCULATED FINANCIALS
    // ========================================================

    netProfit: {
      type: Number,
      default: 40.0,
    },

    profitMargin: {
      type: Number,
      default: 40.0,
    },

    netWorth: {
      type: Number,
      default: 110.0,
    },

    // ========================================================
    // FUNDING & INVESTMENT PROFILE
    // ========================================================

    minInvestment: {
      type: Number,
      default: 100000,
    },

    maxInvestment: {
      type: Number,
      default: 1000000,
    },

    fundingRequired: {
      type: Number,
      default: 500000,
    },

    equityOffered: {
      type: Number,
      default: 10.0,
    },

    valuation: {
      type: Number,
      default: 5000000,
    },

    expectedROI: {
      type: Number,
      default: 25.0,
    },

    valuationSource: {
      type: String,

      enum: ["FOUNDER_DECLARED", "SYSTEM_CALCULATED", "ADVISOR_REVIEWED"],

      default: "FOUNDER_DECLARED",
    },

    valuationStatus: {
      type: String,

      enum: ["UNVERIFIED", "REVIEWED", "VERIFIED"],

      default: "UNVERIFIED",
    },

    // ========================================================
    // MARKETING & UNIT ECONOMICS
    // ========================================================

    marketingBudget: {
      type: Number,
      default: 20000,
    },

    marketingSpend: {
      type: Number,
      default: 15000,
    },

    customers: {
      type: Number,
      default: 100,
    },

    leads: {
      type: Number,
      default: 3000,
    },

    cac: {
      type: Number,
      default: 150.0,
    },

    ltv: {
      type: Number,
      default: 1200.0,
    },

    ltvCacRatio: {
      type: Number,
      default: 8.0,
    },

    roas: {
      type: Number,
      default: 4.5,
    },

    conversionRate: {
      type: Number,
      default: 3.2,
    },

    tam: {
      type: Number,
      default: 10.0,
    },

    sam: {
      type: Number,
      default: 2.5,
    },

    som: {
      type: Number,
      default: 0.5,
    },

    // ========================================================
    // RISK RATINGS
    // ========================================================

    financialRisk: {
      type: Number,
      default: 25.0,
    },

    marketRisk: {
      type: Number,
      default: 25.0,
    },

    operationalRisk: {
      type: Number,
      default: 25.0,
    },

    regulatoryRisk: {
      type: Number,
      default: 20.0,
    },

    techRisk: {
      type: Number,
      default: 20.0,
    },

    // ========================================================
    // CALCULATED VALUATION & HEALTH METRICS
    // ========================================================

    healthScore: {
      type: Number,
      default: 75.0,
    },

    overallRiskScore: {
      type: Number,
      default: 25.0,
    },

    dcfEnterpriseValue: {
      type: Number,
      default: 0.0,
    },

    dcfEquityValue: {
      type: Number,
      default: 0.0,
    },

    fairSharePrice: {
      type: Number,
      default: 0.0,
    },

    priceUpsidePercent: {
      type: Number,
      default: 0.0,
    },

    recommendation: {
      type: String,
      default: "HOLD",
      trim: true,
    },

    recommendationColorHex: {
      type: String,
      default: "#F2A93B",
      trim: true,
    },

    projectedRevenues: [
      {
        type: Number,
      },
    ],

    projectedFCF: [
      {
        type: Number,
      },
    ],

    // ========================================================
    // FOUNDER ASSESSMENT
    // ========================================================

    assessmentCompleted: {
      type: Boolean,
      default: false,
    },

    assessmentScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    assessmentArchetype: {
      type: String,
      default: "",
      trim: true,
    },

    assessmentDomainScores: {
      strategy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      operations: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      finance: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      leadership: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      marketing: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    // ========================================================
    // STATUS WORKFLOW
    // ========================================================

    status: {
      type: String,

      enum: [
        "Draft",
        "Verification Pending",
        "Investment Ready",

        // Current normalized statuses
        "DRAFT",
        "PROFILE_INCOMPLETE",
        "KYC_PENDING",
        "ASSESSMENT_PENDING",
        "DOCUMENT_REVIEW",
        "INVESTMENT_READY",
        "PUBLISHED",
        "ARCHIVED",
      ],

      default: "Draft",
      index: true,
    },

    favorite: {
      type: Boolean,
      default: false,
    },

    flagged: {
      type: Boolean,
      default: false,
    },

    archived: {
      type: Boolean,
      default: false,
    },

    isPreset: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ========================================================
    // COMPLETENESS
    // ========================================================

    completeness: {
      profile: {
        type: Number,
        default: 80,
        min: 0,
        max: 100,
      },

      kyc: {
        type: Number,
        default: 75,
        min: 0,
        max: 100,
      },

      team: {
        type: Number,
        default: 70,
        min: 0,
        max: 100,
      },

      business: {
        type: Number,
        default: 85,
        min: 0,
        max: 100,
      },

      financials: {
        type: Number,
        default: 90,
        min: 0,
        max: 100,
      },

      funding: {
        type: Number,
        default: 60,
        min: 0,
        max: 100,
      },

      documents: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
      },

      assessment: {
        type: Number,
        default: 65,
        min: 0,
        max: 100,
      },

      overall: {
        type: Number,
        default: 72,
        min: 0,
        max: 100,
      },
    },

    // ========================================================
    // STRUCTURED SWOT & PESTLE
    // ========================================================

    swotItems: [swotItemSchema],

    pestleItems: [pestleItemSchema],

    // ========================================================
    // LEGACY SWOT
    // ========================================================

    swot: {
      strengths: [
        {
          type: String,
          trim: true,
        },
      ],

      weaknesses: [
        {
          type: String,
          trim: true,
        },
      ],

      opportunities: [
        {
          type: String,
          trim: true,
        },
      ],

      threats: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // ========================================================
    // LEGACY PESTLE
    // ========================================================

    pestle: {
      political: [
        {
          type: String,
          trim: true,
        },
      ],

      economic: [
        {
          type: String,
          trim: true,
        },
      ],

      social: [
        {
          type: String,
          trim: true,
        },
      ],

      technological: [
        {
          type: String,
          trim: true,
        },
      ],

      legal: [
        {
          type: String,
          trim: true,
        },
      ],

      environmental: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // ========================================================
    // LEGACY EMBEDDED DOCUMENTS
    // ========================================================

    /**
     * Kept temporarily for backward compatibility.
     *
     * New document management should use the separate
     * Document model with companyId ownership.
     */
    documents: [documentSlotSchema],
  },

  {
    timestamps: true,
  },
);

// ============================================================
// INDEXES
// ============================================================

/**
 * Most company lookups are performed using ticker.
 */
companySchema.index({
  ticker: 1,
});

/**
 * Useful for retrieving companies owned/created by
 * the legacy userId field.
 *
 * CompanyMember remains the authorization source of truth.
 */
companySchema.index({
  userId: 1,
  updatedAt: -1,
});

/**
 * Useful for preset/company discovery.
 */
companySchema.index({
  isPreset: 1,
  updatedAt: -1,
});

/**
 * Useful for company status based filtering.
 */
companySchema.index({
  status: 1,
  updatedAt: -1,
});

// ============================================================
// EXPORT
// ============================================================

export default mongoose.model("Company", companySchema);
