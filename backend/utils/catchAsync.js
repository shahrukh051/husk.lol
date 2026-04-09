'use strict';

/**
 * catchAsync — Wraps async route handlers to catch rejected promises
 * and forward them to Express's error middleware.
 *
 * Without this, unhandled promise rejections in async handlers would
 * crash the process or produce silent failures.
 *
 * Usage:
 *   exports.myHandler = catchAsync(async (req, res, next) => { ... });
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
