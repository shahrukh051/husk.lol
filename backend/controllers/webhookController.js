'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Partner = require('../models/Partner');
const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * POST /api/v1/webhooks/stripe
 * Handles all Stripe events — verified via webhook signature
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      // ── Payment succeeded ────────────────────────────────────────────────
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const order = await Order.findOne({
          stripePaymentIntentId: intent.id,
        }).populate('user', 'firstName email');

        if (order) {
          order.paymentStatus = 'paid';
          order.status = 'confirmed';
          order.stripeChargeId = intent.latest_charge;
          order.statusHistory.push({ status: 'confirmed', note: 'Payment confirmed' });
          await order.save();

          // Award ritual points
          await User.findByIdAndUpdate(order.user._id, {
            $inc: { ritualPoints: Math.floor(order.total) },
          });

          // Partner commission
          if (order.referredByPartner) {
            await creditPartnerCommission(order);
          }

          // Send confirmation email
          emailService.sendOrderConfirmation(order).catch((err) =>
            logger.error('Order confirmation email failed:', err)
          );

          logger.info(`Order ${order.orderNumber} payment confirmed`);
        }
        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const order = await Order.findOne({ stripePaymentIntentId: intent.id });

        if (order) {
          order.paymentStatus = 'failed';
          order.status = 'cancelled';
          order.statusHistory.push({
            status: 'cancelled',
            note: `Payment failed: ${intent.last_payment_error?.message || 'Unknown error'}`,
          });
          await order.save();

          logger.warn(`Order ${order.orderNumber} payment failed`);
        }
        break;
      }

      // ── Subscription events ──────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            status: sub.status === 'active' ? 'active' : sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            nextBillingDate: new Date(sub.current_period_end * 1000),
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: 'cancelled', cancelledAt: new Date() }
        );
        break;
      }

      // ── Invoice paid (subscription renewal) ──────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription,
          });

          if (subscription) {
            subscription.totalOrdersCount += 1;
            subscription.totalSpent += invoice.amount_paid / 100;
            await subscription.save();
          }
        }
        break;
      }

      // ── Invoice payment failed ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            { status: 'past_due' }
          );
        }
        break;
      }

      // ── Refund ───────────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object;
        const order = await Order.findOne({ stripeChargeId: charge.id });
        if (order) {
          order.paymentStatus = 'refunded';
          order.status = 'refunded';
          order.statusHistory.push({ status: 'refunded', note: 'Stripe refund processed' });
          await order.save();
        }
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err) {
    logger.error(`Error processing Stripe event ${event.type}:`, err);
    // Still return 200 to Stripe to prevent retries for logic errors
    return res.status(200).json({ received: true, warning: 'Event processing error logged' });
  }

  res.status(200).json({ received: true });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function creditPartnerCommission(order) {
  try {
    const partner = await Partner.findById(order.referredByPartner);
    if (!partner || partner.status !== 'approved') return;

    const commission = parseFloat((order.total * partner.commissionRate).toFixed(2));

    partner.commissionHistory.push({
      order: order._id,
      amount: commission,
      rate: partner.commissionRate,
      status: 'pending',
    });

    partner.totalReferrals += 1;
    partner.totalRevenue += order.total;
    partner.totalEarnings += commission;
    partner.pendingPayout += commission;

    // Auto-upgrade to golden tier if threshold reached
    if (partner.isGoldenEligible && partner.tier !== 'golden') {
      partner.tier = 'golden';
      partner.commissionRate = 0.20; // Golden tier bonus rate
      logger.info(`Partner ${partner._id} upgraded to Golden Tier`);
    }

    await partner.save();
    logger.info(`Partner ${partner._id} credited $${commission} for order ${order.orderNumber}`);
  } catch (err) {
    logger.error('Partner commission credit failed:', err);
  }
}
