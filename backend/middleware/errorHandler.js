'use strict';

const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// ─── Error Type Handlers ───────────────────────────────────────────────────────

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for field '${field}': "${value}". Please use a different value.`;
  return new AppError(message, 409);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid authentication token. Please sign in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please sign in again.', 401);

const handleStripeError = (err) => {
  // Map Stripe error types to user-friendly messages
  const messages = {
    card_error: err.message,
    invalid_request_error: 'Invalid payment request. Please check your details.',
    authentication_error: 'Payment authentication failed.',
    rate_limit_error: 'Too many requests. Please try again shortly.',
    api_error: 'Payment service temporarily unavailable.',
  };
  const message = messages[err.type] || 'Payment processing failed.';
  return new AppError(message, 402);
};

// ─── Response Formatters ──────────────────────────────────────────────────────

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational errors: send clear message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming / unknown errors: log but hide details from client
  logger.error('UNEXPECTED ERROR:', err);

  res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again.',
  });
};

// ─── Main Error Handler ────────────────────────────────────────────────────────
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${req.method}] ${req.originalUrl} → ${err.message}`);
    sendErrorDev(err, res);
  } else {
    let error = Object.assign(new AppError(err.message, err.statusCode), err);

    // MongoDB errors
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

    // JWT errors
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // Stripe errors
    if (err.type && err.type.includes('Stripe')) error = handleStripeError(err);

    sendErrorProd(error, res);
  }
};
