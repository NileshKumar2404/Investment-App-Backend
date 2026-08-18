import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFORMATION
    // =========================

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
      default: "India",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },

    language: {
      type: String,
      required: true,
      trim: true,
      default: "English",
    },

    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    // =========================
    // PROFESSIONAL INFORMATION
    // =========================

    occupation: {
      type: String,
      trim: true,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    position: {
      type: String,
      trim: true,
      default: "",
    },

    experience: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =========================
    // ROLE & ACCESS CONTROL
    // =========================

    role: {
      type: String,
      enum: [
        "founder",
        "investor",
        "analyst",
        "advisor",
        "admin",
        "super_admin",
      ],
      default: "founder",
      required: true,
      index: true,
    },

    // =========================
    // ACCOUNT STATUS
    // =========================

    accountStatus: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Pending"],
      default: "Active",
      index: true,
    },

    verified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =========================
    // LOGIN / ACCOUNT ACTIVITY
    // =========================

    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    // =========================
    // PASSWORD RESET
    // =========================

    /**
     * SHA-256 hash of the password reset token.
     *
     * We store only the hash in MongoDB.
     * The raw reset token should never be persisted.
     */
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
      index: true,
    },

    /**
     * Password reset token expiry.
     */
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
      index: true,
    },

    // =========================
    // PROFILE
    // =========================

    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// PASSWORD HASHING
// ============================================================

/**
 * Hash password only when it is created or changed.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// ============================================================
// PASSWORD VERIFICATION
// ============================================================

/**
 * Compare a plain-text password with the stored hash.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ============================================================
// PASSWORD RESET CLEANUP
// ============================================================

/**
 * Clear password reset information.
 */
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = null;
  this.passwordResetExpires = null;
};

// ============================================================
// MODEL
// ============================================================

const User = mongoose.model("User", userSchema);

export default User;
