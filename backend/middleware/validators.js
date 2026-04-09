'use strict';

const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Collect validation errors and forward to error handler
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    return next(new AppError(messages, 400));
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

exports.registerRules = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

exports.loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

exports.resetPasswordRules = [
  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  param('token')
    .notEmpty().withMessage('Reset token is required')
    .isHexadecimal().withMessage('Invalid token format'),
];

// ─── Order Validators ─────────────────────────────────────────────────────────

exports.createOrderRules = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must include at least one item'),

  body('items.*.productId')
    .notEmpty().withMessage('Product ID is required for each item')
    .isMongoId().withMessage('Invalid product ID'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),

  body('shippingAddress.line1')
    .notEmpty().withMessage('Shipping address line 1 is required'),

  body('shippingAddress.city')
    .notEmpty().withMessage('City is required'),

  body('shippingAddress.postalCode')
    .notEmpty().withMessage('Postal code is required'),

  body('shippingAddress.country')
    .notEmpty().withMessage('Country is required')
    .isISO31661Alpha2().withMessage('Invalid country code'),
];

// ─── Partner Validators ───────────────────────────────────────────────────────

exports.partnerApplyRules = [
  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ max: 100 }).withMessage('Business name cannot exceed 100 characters'),

  body('niche')
    .notEmpty().withMessage('Niche is required')
    .isIn(['wellness', 'fitness', 'lifestyle', 'nutrition', 'beauty', 'medical', 'other'])
    .withMessage('Invalid niche category'),

  body('audienceSize')
    .optional()
    .isInt({ min: 0 }).withMessage('Audience size must be a positive number'),

  body('website')
    .optional()
    .isURL().withMessage('Website must be a valid URL'),
];

// ─── Subscription Validators ──────────────────────────────────────────────────

exports.createSubscriptionRules = [
  body('plan')
    .notEmpty().withMessage('Subscription plan is required')
    .isIn(['weekly', 'biweekly', 'monthly']).withMessage('Invalid plan. Choose: weekly, biweekly, or monthly'),

  body('selectedProducts')
    .isArray({ min: 1 }).withMessage('At least one product must be selected'),

  body('selectedProducts.*.productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),

  body('selectedProducts.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

// ─── Product Validators ───────────────────────────────────────────────────────

exports.createProductRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 120 }).withMessage('Name cannot exceed 120 characters'),

  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['jelly', 'powder', 'capsule', 'bundle', 'limited'])
    .withMessage('Invalid category'),
];

exports.addReviewRules = [
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Review title cannot exceed 100 characters'),

  body('body')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Review body cannot exceed 1000 characters'),
];

// ─── Pagination/Query Validators ──────────────────────────────────────────────

exports.paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
