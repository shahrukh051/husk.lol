'use strict';

const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');
const { validate, createSubscriptionRules } = require('../middleware/validators');

// All subscription routes require auth
router.use(protect);

router.post('/', createSubscriptionRules, validate, subscriptionController.createSubscription);
router.get('/me', subscriptionController.getMySubscription);
router.patch('/me/pause', subscriptionController.pauseSubscription);
router.patch('/me/resume', subscriptionController.resumeSubscription);
router.delete('/me/cancel', subscriptionController.cancelSubscription);
router.patch('/me/products', subscriptionController.updateSubscriptionProducts);

module.exports = router;
