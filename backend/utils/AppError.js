'use strict';

/**
 * AppError — Custom operational error class.
 *
 * Operational errors are expected errors that we can anticipate and handle
 * gracefully (e.g. user not found, invalid input). They are distinguished
 * from programming errors (bugs) which should be logged but hidden from users.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Flag to distinguish from unexpected errors

    // Maintain proper stack trace (V8 specific)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
