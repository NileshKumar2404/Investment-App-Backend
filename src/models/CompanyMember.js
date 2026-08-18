import mongoose from "mongoose";

const companyMemberSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------
    // COMPANY
    // ----------------------------------------------------------

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // ----------------------------------------------------------
    // USER
    // ----------------------------------------------------------

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ----------------------------------------------------------
    // COMPANY ROLE
    // ----------------------------------------------------------

    /**
     * Company-level role.
     *
     * IMPORTANT:
     * Keep these values uppercase and canonical.
     *
     * Do not add:
     *   Founder
     *   Co-Founder
     *   Finance Director
     *   Viewer
     *
     * as separate enum values.
     */
    roleOnCompany: {
      type: String,

      enum: [
        "OWNER",
        "FOUNDER",
        "CO_FOUNDER",
        "FINANCE",
        "ANALYST",
        "ADVISOR",
        "VIEWER",
      ],

      default: "VIEWER",

      uppercase: true,

      trim: true,

      required: true,
    },

    // ----------------------------------------------------------
    // MEMBERSHIP STATUS
    // ----------------------------------------------------------

    /**
     * Lifecycle of a company membership.
     */
    status: {
      type: String,

      enum: ["INVITED", "ACTIVE", "SUSPENDED", "REMOVED"],

      default: "ACTIVE",

      uppercase: true,

      trim: true,

      required: true,
    },

    // ----------------------------------------------------------
    // INVITED BY
    // ----------------------------------------------------------

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ----------------------------------------------------------
    // JOINED AT
    // ----------------------------------------------------------

    joinedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  },
);

// ============================================================
// COMPOUND UNIQUE INDEX
// ============================================================

/**
 * A user can have only one membership record
 * for a particular company.
 *
 * This prevents duplicate membership records.
 */
companyMemberSchema.index(
  {
    companyId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

// ============================================================
// ACTIVE MEMBERSHIP INDEX
// ============================================================

/**
 * Frequently used by authorization middleware:
 *
 * CompanyMember.findOne({
 *   companyId,
 *   userId,
 *   status: "ACTIVE"
 * })
 */
companyMemberSchema.index({
  companyId: 1,
  userId: 1,
  status: 1,
});

// ============================================================
// COMPANY ROLE INDEX
// ============================================================

/**
 * Useful for company member management and
 * role-based queries.
 */
companyMemberSchema.index({
  companyId: 1,
  roleOnCompany: 1,
  status: 1,
});

// ============================================================
// NORMALIZE ROLE BEFORE VALIDATION
// ============================================================

companyMemberSchema.pre("validate", function (next) {
  if (typeof this.roleOnCompany === "string") {
    this.roleOnCompany = this.roleOnCompany
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
  }

  if (typeof this.status === "string") {
    this.status = this.status.trim().toUpperCase();
  }

  next();
});

// ============================================================
// SET JOINED DATE WHEN ACTIVATED
// ============================================================

companyMemberSchema.pre("save", function (next) {
  if (this.status === "ACTIVE" && !this.joinedAt) {
    this.joinedAt = new Date();
  }

  next();
});

// ============================================================
// MODEL
// ============================================================

export default mongoose.model("CompanyMember", companyMemberSchema);
