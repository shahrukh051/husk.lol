'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * protect
 * Validates JWT from Authorization header or httpOnly cookie.
 * Attaches decoded user to req.user.
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1. Look in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fall back to httpOnly cookie
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please sign in to continue.', 401));
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please sign in again.', 401));
    }
    return next(new AppError('Authentication failed', 401));
  }

  // Confirm user still exists
  const user = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!user) {
    return next(new AppError('The account associated with this token no longer exists', 401));
  }

  // Check if password was changed after token was issued
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password was recently changed. Please sign in again.', 401));
  }

  req.user = user;
  next();
});

/**
 * restrictTo(...roles)
 * Role-based access control. Call after protect().
 *
 * Usage: router.delete('/admin/users/:id', protect, restrictTo('admin'), handler)
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

/**
 * optionalAuth
 * Attaches user if token present, continues either way.
 * Useful for public routes that behave differently for logged-in users.
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && !user.changedPasswordAfter(decoded.iat)) {
      req.user = user;
    }
  } catch {
    // Silently ignore — just won't attach user
  }

  next();
});
