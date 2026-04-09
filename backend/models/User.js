'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },

    // ─── Role & Status ─────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['customer', 'partner', 'admin'],
      default: 'customer',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    // ─── Membership ────────────────────────────────────────────────────────
    membershipTier: {
      type: String,
      enum: ['standard', 'alchemist', 'golden'],
      default: 'standard',
    },
    ritualPoints: {
      type: Number,
      default: 0,
    },
    ritualStreak: {
      type: Number,
      default: 0,
    },
    lastRitualDate: {
      type: Date,
      default: null,
    },

    // ─── Address ───────────────────────────────────────────────────────────
    addresses: [
      {
        label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
        line1: String,
        line2: String,
        city: String,
        state: String,
        postalCode: String,
        country: { type: String, default: 'US' },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // ─── Payment ───────────────────────────────────────────────────────────
    stripeCustomerId: {
      type: String,
      default: null,
      select: false,
    },

    // ─── Preferences ───────────────────────────────────────────────────────
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      flavorProfile: [{ type: String }], // e.g. ['citrus', 'chocolate']
      dietaryFlags: [{ type: String }],  // e.g. ['vegan', 'gluten-free']
    },

    // ─── Auth Tokens ───────────────────────────────────────────────────────
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },

    // ─── OAuth ─────────────────────────────────────────────────────────────
    googleId: { type: String, select: false },
    appleId: { type: String, select: false },

    // ─── Referral ──────────────────────────────────────────────────────────
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });

// ─── Pre-save: Hash password ───────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  this.passwordChangedAt = new Date(Date.now() - 1000); // Ensure JWT issued after this
  next();
});

// ─── Pre-save: Auto-generate referral code ────────────────────────────────────
userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIssuedAt < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verifyToken;
};

// ─── Query Middleware: Filter inactive users ───────────────────────────────────
userSchema.pre(/^find/, function (next) {
  // Only show active users unless explicitly overridden
  if (!this.getOptions().includeInactive) {
    this.where({ isActive: true });
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
