'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,               // Snapshot of name at time of order
  price: Number,              // Snapshot of price at time of order
  quantity: { type: Number, required: true, min: 1 },
  isSubscriptionItem: { type: Boolean, default: false },
});

const orderSchema = new mongoose.Schema(
  {
    // ─── Ownership ─────────────────────────────────────────────────────────
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: String, unique: true },

    // ─── Items ─────────────────────────────────────────────────────────────
    items: [orderItemSchema],

    // ─── Financials ────────────────────────────────────────────────────────
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'USD' },

    // ─── Coupon ────────────────────────────────────────────────────────────
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },

    // ─── Shipping Address (snapshot) ───────────────────────────────────────
    shippingAddress: {
      fullName: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // ─── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // ─── Payment ───────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['card', 'google_pay', 'apple_pay', 'subscription'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String, select: false },
    stripeChargeId: { type: String, select: false },

    // ─── Shipping ──────────────────────────────────────────────────────────
    trackingNumber: { type: String, default: null },
    carrier: { type: String, default: null },
    estimatedDelivery: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },

    // ─── Partner Attribution ───────────────────────────────────────────────
    referredByPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      default: null,
    },
    partnerCommissionPaid: { type: Boolean, default: false },

    // ─── Notes ─────────────────────────────────────────────────────────────
    customerNote: { type: String, maxlength: 500 },
    adminNote: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'shippingAddress.postalCode': 1 });

// ─── Pre-save: auto-generate order number ─────────────────────────────────────
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `VH-${String(count + 1001).padStart(6, '0')}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
