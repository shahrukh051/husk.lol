'use strict';

const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const stripeService = require('../services/stripeService');
const logger = require('../config/logger');

/**
 * POST /api/v1/subscriptions
 * Create a new subscription
 */
exports.createSubscription = catchAsync(async (req, res, next) => {
  const existing = await Subscription.findOne({ user: req.user.id, status: 'active' });
  if (existing) {
    return next(new AppError('You already have an active subscription', 409));
  }

  const { plan, selectedProducts, deliveryAddress, paymentMethodId } = req.body;

  // Validate products
  const productIds = selectedProducts.map((p) => p.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    availableForSubscription: true,
    status: 'active',
  });

  if (products.length !== selectedProducts.length) {
    return next(new AppError('One or more products are not available for subscription', 400));
  }

  // Calculate total with subscription discount
  const items = selectedProducts.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId);
    return { product: product._id, quantity: item.quantity };
  });

  // Create Stripe subscription (simplified — full impl would use Stripe's subscription API)
  const stripeSubscription = await stripeService.createSubscription({
    customerId: req.user.stripeCustomerId,
    paymentMethodId,
    plan,
    items: products.map((p) => ({
      price: p.stripePriceId,
      quantity: selectedProducts.find((i) => i.productId === p._id.toString()).quantity,
    })),
  });

  const now = new Date();
  const nextBilling = new Date(now);
  const planDays = { weekly: 7, biweekly: 14, monthly: 30 };
  nextBilling.setDate(nextBilling.getDate() + planDays[plan]);

  const subscription = await Subscription.create({
    user: req.user.id,
    plan,
    selectedProducts: items,
    deliveryAddress,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: nextBilling,
    nextBillingDate: nextBilling,
    stripeSubscriptionId: stripeSubscription.id,
  });

  logger.info(`Subscription created for user ${req.user.id}, plan: ${plan}`);

  res.status(201).json({ status: 'success', data: { subscription } });
});

/**
 * GET /api/v1/subscriptions/me
 */
exports.getMySubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({
    user: req.user.id,
    status: { $in: ['active', 'paused'] },
  }).populate('selectedProducts.product', 'name images price slug subscriptionDiscount');

  if (!subscription) {
    return next(new AppError('No active subscription found', 404));
  }

  res.status(200).json({ status: 'success', data: { subscription } });
});

/**
 * PATCH /api/v1/subscriptions/me/pause
 */
exports.pauseSubscription = catchAsync(async (req, res, next) => {
  const { pauseUntil } = req.body;

  const subscription = await Subscription.findOne({ user: req.user.id, status: 'active' });
  if (!subscription) {
    return next(new AppError('No active subscription to pause', 404));
  }

  const pauseDate = pauseUntil ? new Date(pauseUntil) : null;
  if (pauseDate && pauseDate <= new Date()) {
    return next(new AppError('Pause date must be in the future', 400));
  }

  subscription.status = 'paused';
  subscription.pausedUntil = pauseDate;
  await subscription.save();

  // Pause in Stripe
  await stripeService.pauseSubscription(subscription.stripeSubscriptionId).catch((err) =>
    logger.error('Stripe pause failed:', err)
  );

  res.status(200).json({ status: 'success', data: { subscription } });
});

/**
 * PATCH /api/v1/subscriptions/me/resume
 */
exports.resumeSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({ user: req.user.id, status: 'paused' });
  if (!subscription) {
    return next(new AppError('No paused subscription found', 404));
  }

  subscription.status = 'active';
  subscription.pausedUntil = null;
  await subscription.save();

  await stripeService.resumeSubscription(subscription.stripeSubscriptionId).catch((err) =>
    logger.error('Stripe resume failed:', err)
  );

  res.status(200).json({ status: 'success', data: { subscription } });
});

/**
 * DELETE /api/v1/subscriptions/me/cancel
 */
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({
    user: req.user.id,
    status: { $in: ['active', 'paused'] },
  });

  if (!subscription) {
    return next(new AppError('No active subscription to cancel', 404));
  }

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  subscription.cancelReason = req.body.reason || 'User cancelled';
  await subscription.save();

  // Cancel at period end in Stripe (not immediately)
  await stripeService.cancelSubscription(subscription.stripeSubscriptionId).catch((err) =>
    logger.error('Stripe cancellation failed:', err)
  );

  logger.info(`Subscription cancelled for user ${req.user.id}`);

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled. You will continue to have access until the end of your billing period.',
  });
});

/**
 * PATCH /api/v1/subscriptions/me/products
 * Swap products in current subscription
 */
exports.updateSubscriptionProducts = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({ user: req.user.id, status: 'active' });
  if (!subscription) {
    return next(new AppError('No active subscription found', 404));
  }

  const { selectedProducts } = req.body;
  const productIds = selectedProducts.map((p) => p.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    availableForSubscription: true,
    status: 'active',
  });

  if (products.length !== selectedProducts.length) {
    return next(new AppError('One or more products are not available', 400));
  }

  subscription.selectedProducts = selectedProducts.map((item) => ({
    product: item.productId,
    quantity: item.quantity,
  }));

  await subscription.save();

  res.status(200).json({ status: 'success', data: { subscription } });
});
