import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '-' },
    country: { type: String, default: 'India' },
    city: { type: String, default: '' },
    timezone: { type: String, default: 'UTC+05:30' },
    language: { type: String, default: 'English' },
    currency: { type: String, default: 'INR' },
    dob: { type: Date },
    gender: { type: String, default: 'Not specified' },
    occupation: { type: String, default: 'Founder / Executive' },
    company: { type: String, default: '' },
    position: { type: String, default: 'CEO' },
    experience: { type: String, default: '5+ years' },
    role: {
      type: String,
      enum: ['founder', 'investor', 'analyst', 'advisor', 'admin', 'super_admin'],
      default: 'founder',
    },
    accountStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    verified: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    lastLogin: { type: Date },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare input password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
