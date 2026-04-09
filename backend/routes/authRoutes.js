'use strict';

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validate,
  registerRules,
  loginRules,
  resetPasswordRules,
} = require('../middleware/validators');
const rateLimiter = require('../middleware/rateLimiter');

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/logout', authController.logout);

router.post(
  '/forgot-password',
  rateLimiter.strict,
  authController.forgotPassword
);

router.patch(
  '/reset-password/:token',
  rateLimiter.strict,
  resetPasswordRules,
  validate,
  authController.resetPassword
);

router.get('/verify-email/:token', authController.verifyEmail);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(protect);

router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);

module.exports = router;
