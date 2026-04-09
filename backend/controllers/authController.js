'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sign a JWT token for a given user ID
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Send JWT as a secure httpOnly cookie + JSON body
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,               // Prevents JS access — XSS protection
    sameSite: 'strict',           // CSRF protection
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove sensitive fields from output
  user.password = undefined;
  user.isActive = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Create account, send verification email
 */
exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, referralCode } = req.body;

  // Check if user already exists
  const existing = await User.findOne({ email }).setOptions({ includeInactive: true });
  if (existing) {
    return next(new AppError('An account with this email already exists', 409));
  }

  // Resolve referral
  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (referrer) referredBy = referrer._id;
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    referredBy,
  });

  // Generate and save email verification token
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email (non-blocking)
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  emailService.sendEmailVerification(user, verifyUrl).catch((err) => {
    logger.error('Failed to send verification email:', err);
  });

  logger.info(`New user registered: ${email}`);
  sendTokenResponse(user, 201, res);
});

/**
 * POST /api/v1/auth/login
 * Validate credentials, return JWT
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  // Explicitly select password field (excluded by default)
  const user = await User.findOne({ email }).select('+password +isActive');

  if (!user || !(await user.comparePassword(password))) {
    // Generic message to prevent user enumeration
    return next(new AppError('Invalid email or password', 401));
  }

  logger.info(`User logged in: ${email}`);
  sendTokenResponse(user, 200, res);
});

/**
 * POST /api/v1/auth/logout
 * Clear cookie
 */
exports.logout = catchAsync(async (req, res) => {
  res.cookie('jwt', 'logged_out', {
    expires: new Date(Date.now() + 5000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

/**
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If an account exists, a reset link has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await emailService.sendPasswordReset(user, resetUrl);
    res.status(200).json({
      status: 'success',
      message: 'If an account exists, a reset link has been sent.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    logger.error('Password reset email failed:', err);
    return next(new AppError('Failed to send email. Please try again.', 500));
  }
});

/**
 * PATCH /api/v1/auth/reset-password/:token
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return next(new AppError('Reset token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info(`Password reset for user: ${user.email}`);
  sendTokenResponse(user, 200, res);
});

/**
 * GET /api/v1/auth/verify-email/:token
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return next(new AppError('Verification token is invalid or has expired', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.membershipTier = 'alchemist'; // Upgrade on verification
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email verified. Welcome to the Alchemist Club!',
  });
});

/**
 * GET /api/v1/auth/me
 * Returns current logged-in user
 */
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

/**
 * PATCH /api/v1/auth/update-password
 * Change password while logged in
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});
