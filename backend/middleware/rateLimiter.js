'use strict';

const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

/**
 * Create a custom rate limiter with shared options
 */
const createLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessful || false,
    handler: (req, res, next) => {
      next(
        new AppError(
          options.message || 'Too many requests. Please try again later.',
          429
        )
      );
    },
    keyGenerator: (req) => {
      // Use forwarded IP (for proxies/load balancers) or direct IP
      return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    },
  });

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/**
 * General API limiter: 100 requests per 15 minutes
 */
exports.general = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP. Please try again in 15 minutes.',
});

/**
 * Auth limiter: 10 attempts per 15 minutes (brute-force protection)
 * Does NOT skip failed requests — counts every attempt
 */
exports.auth = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessful: false,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
});

/**
 * Strict limiter for sensitive endpoints (password reset, email verify)
 */
exports.strict = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many requests for this action. Please wait an hour.',
});

/**
 * Upload limiter: 20 uploads per hour
 */
exports.upload = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many file uploads. Please try again in an hour.',
});
