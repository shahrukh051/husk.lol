'use strict';

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// IMPORTANT: Stripe requires the raw body for signature verification
// This must be mounted BEFORE express.json() in app.js
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

module.exports = router;
