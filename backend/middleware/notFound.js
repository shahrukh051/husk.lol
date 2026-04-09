'use strict';

const AppError = require('../utils/AppError');

/**
 * 404 handler — placed AFTER all routes.
 * Any request that falls through means no route matched.
 */
module.exports = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};
