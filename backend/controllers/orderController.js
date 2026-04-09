'use strict';

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Partner = require('../models/Partner');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const stripeService = require('../services/stripeService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * POST /api/v1/orders
 * Create order + Stripe payment intent
 */
exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, shippingAddress, paymentMethodId, couponCode, referralCode } = req.body;

  if (!items || !items.length) {
    return next(new AppError('Order must contain at least one item', 400));
  }

  // Validate and price all items from DB (never trust client prices)
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, status: 'active' });

  if (products.length !== items.length) {
    return next(new AppError('One or more products are unavailable', 400));
  }

  const orderItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId);
    return {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingCost = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
  const taxRate = 0.08; // 8% — in production, use a tax API
  const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + shippingCost + taxAmount).toFixed(2));

  // Resolve partner referral attribution
  let referredByPartner = null;
  if (referralCode) {
    const partner = await Partner.findOne({ referralCode: referralCode.toUpperCase() });
    if (partner) referredByPartner = partner._id;
  }

  // Create Stripe payment intent
  const paymentIntent = await stripeService.createPaymentIntent({
    amount: Math.round(total * 100), // Stripe uses cents
    currency: 'usd',
    customerId: req.user.stripeCustomerId,
    paymentMethodId,
    metadata: { userId: req.user.id },
  });

  // Create order record
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingCost,
    taxAmount,
    total,
    shippingAddress,
    paymentStatus: 'pending',
    stripePaymentIntentId: paymentIntent.id,
    referredByPartner,
    statusHistory: [{ status: 'pending', note: 'Order created' }],
  });

  logger.info(`Order created: ${order.orderNumber} for user ${req.user.id}`);

  // Award ritual points (1 point per $1 spent)
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { ritualPoints: Math.floor(total) },
  });

  res.status(201).json({
    status: 'success',
    data: {
      order,
      clientSecret: paymentIntent.client_secret,
    },
  });
});

/**
 * GET /api/v1/orders/my
 * Current user's orders
 */
exports.getMyOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { user: req.user.id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .populate('items.product', 'name images slug');

  const total = await Order.countDocuments(filter);

  res.status(200).json({ status: 'success', total, data: { orders } });
});

/**
 * GET /api/v1/orders/:id
 */
exports.getOrder = catchAsync(async (req, res, next) => {
  const query = { _id: req.params.id };

  // Non-admins can only see their own orders
  if (req.user.role !== 'admin') {
    query.user = req.user.id;
  }

  const order = await Order.findOne(query).populate(
    'items.product',
    'name images slug price'
  );

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({ status: 'success', data: { order } });
});

/**
 * PATCH /api/v1/orders/:id/cancel
 */
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (!['pending', 'confirmed'].includes(order.status)) {
    return next(new AppError('This order cannot be cancelled at its current stage', 400));
  }

  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: req.body.reason || 'Customer cancelled' });
  await order.save();

  // Trigger Stripe refund if already paid
  if (order.paymentStatus === 'paid' && order.stripeChargeId) {
    await stripeService.createRefund(order.stripeChargeId, order.total).catch((err) => {
      logger.error('Refund failed:', err);
    });
  }

  res.status(200).json({ status: 'success', data: { order } });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/orders (admin only)
 */
exports.getAllOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 25, status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .populate('user', 'firstName lastName email');

  const total = await Order.countDocuments(filter);

  res.status(200).json({ status: 'success', total, data: { orders } });
});

/**
 * PATCH /api/v1/orders/:id/status (admin only)
 */
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, note, trackingNumber, carrier } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(trackingNumber && { trackingNumber }),
      ...(carrier && { carrier }),
      $push: { statusHistory: { status, note, timestamp: new Date() } },
    },
    { new: true, runValidators: true }
  ).populate('user', 'firstName email');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Send shipping notification
  if (status === 'shipped') {
    emailService.sendShippingNotification(order).catch((err) =>
      logger.error('Shipping email failed:', err)
    );
  }

  res.status(200).json({ status: 'success', data: { order } });
});
