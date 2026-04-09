'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');

/**
 * Stripe service — wraps the Stripe SDK with typed methods
 * and centralised error logging.
 */

/**
 * Create a PaymentIntent
 */
exports.createPaymentIntent = async ({ amount, currency = 'usd', customerId, paymentMethodId, metadata = {} }) => {
  try {
    const params = {
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    };

    if (customerId) params.customer = customerId;
    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
      params.confirmation_method = 'manual';
      params.confirm = true;
    }

    return await stripe.paymentIntents.create(params);
  } catch (err) {
    logger.error('Stripe createPaymentIntent error:', err);
    throw err;
  }
};

/**
 * Create a Stripe Customer (called when user registers)
 */
exports.createCustomer = async ({ email, name, metadata = {} }) => {
  try {
    return await stripe.customers.create({ email, name, metadata });
  } catch (err) {
    logger.error('Stripe createCustomer error:', err);
    throw err;
  }
};

/**
 * Attach a payment method to a customer
 */
exports.attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  } catch (err) {
    logger.error('Stripe attachPaymentMethod error:', err);
    throw err;
  }
};

/**
 * Create a Stripe Subscription
 */
exports.createSubscription = async ({ customerId, paymentMethodId, plan, items }) => {
  try {
    if (paymentMethodId) {
      await exports.attachPaymentMethod(paymentMethodId, customerId);
    }

    // Map plan intervals
    const intervalMap = {
      weekly: { interval: 'week', interval_count: 1 },
      biweekly: { interval: 'week', interval_count: 2 },
      monthly: { interval: 'month', interval_count: 1 },
    };
    const interval = intervalMap[plan] || intervalMap.monthly;

    return await stripe.subscriptions.create({
      customer: customerId,
      items: items.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      })),
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { plan },
    });
  } catch (err) {
    logger.error('Stripe createSubscription error:', err);
    throw err;
  }
};

/**
 * Pause a Stripe Subscription
 */
exports.pauseSubscription = async (stripeSubscriptionId) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: { behavior: 'mark_uncollectible' },
    });
  } catch (err) {
    logger.error('Stripe pauseSubscription error:', err);
    throw err;
  }
};

/**
 * Resume a Stripe Subscription
 */
exports.resumeSubscription = async (stripeSubscriptionId) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: '',
    });
  } catch (err) {
    logger.error('Stripe resumeSubscription error:', err);
    throw err;
  }
};

/**
 * Cancel a Stripe Subscription at period end
 */
exports.cancelSubscription = async (stripeSubscriptionId) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    logger.error('Stripe cancelSubscription error:', err);
    throw err;
  }
};

/**
 * Create a refund
 */
exports.createRefund = async (chargeId, amount) => {
  try {
    return await stripe.refunds.create({
      charge: chargeId,
      amount: Math.round(amount * 100),
    });
  } catch (err) {
    logger.error('Stripe createRefund error:', err);
    throw err;
  }
};

/**
 * Retrieve a PaymentIntent
 */
exports.getPaymentIntent = async (intentId) => {
  try {
    return await stripe.paymentIntents.retrieve(intentId);
  } catch (err) {
    logger.error('Stripe getPaymentIntent error:', err);
    throw err;
  }
};

/**
 * List customer's payment methods
 */
exports.listPaymentMethods = async (customerId) => {
  try {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return methods.data;
  } catch (err) {
    logger.error('Stripe listPaymentMethods error:', err);
    throw err;
  }
};
