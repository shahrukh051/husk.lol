'use strict';

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ─── Plan Config ───────────────────────────────────────────────────────
    plan: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      required: true,
    },
    selectedProducts: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1, min: 1 },
      },
    ],

    // ─── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'past_due'],
      default: 'active',
    },

    // ─── Billing ───────────────────────────────────────────────────────────
    discountRate: { type: Number, default: 0.15 },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextBillingDate: Date,
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    pausedUntil: { type: Date, default: null },

    // ─── Delivery ──────────────────────────────────────────────────────────
    deliveryAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'US' },
    },

    // ─── Stripe ────────────────────────────────────────────────────────────
    stripeSubscriptionId: { type: String, select: false },
    stripePriceId: { type: String, select: false },

    // ─── History ───────────────────────────────────────────────────────────
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    totalOrdersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1, nextBillingDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
