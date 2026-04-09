'use strict';

const mongoose = require('mongoose');
const slugify = require('slugify');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, maxlength: 100 },
    body: { type: String, maxlength: 1000 },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const nutritionSchema = new mongoose.Schema({
  servingSize: String,         // e.g. "1 tablespoon (15g)"
  calories: Number,
  totalFat: Number,            // g
  saturatedFat: Number,        // g
  sodium: Number,              // mg
  totalCarbohydrates: Number,  // g
  dietaryFiber: Number,        // g
  totalSugars: Number,         // g
  protein: Number,             // g
  psylliumHusk: Number,        // g — signature ingredient
});

const productSchema = new mongoose.Schema(
  {
    // ─── Core Info ─────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    slug: { type: String, unique: true },
    tagline: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    flavorNotes: [{ type: String }],  // e.g. ['dark chocolate', 'sea salt', 'earthy']

    // ─── Classification ────────────────────────────────────────────────────
    category: {
      type: String,
      enum: ['jelly', 'powder', 'capsule', 'bundle', 'limited'],
      required: true,
    },
    tags: [{ type: String }],
    flavorProfile: {
      type: String,
      enum: ['citrus', 'chocolate', 'floral', 'herbal', 'spiced', 'tropical', 'neutral'],
    },
    dietaryFlags: [
      {
        type: String,
        enum: ['vegan', 'gluten-free', 'keto', 'organic', 'non-gmo', 'sugar-free'],
      },
    ],

    // ─── Pricing ───────────────────────────────────────────────────────────
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: { type: Number, default: null }, // For sale display
    currency: { type: String, default: 'USD' },
    subscriptionDiscount: { type: Number, default: 0.15 }, // 15% off for subscribers

    // ─── Inventory ─────────────────────────────────────────────────────────
    sku: { type: String, unique: true, sparse: true },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    isInStock: { type: Boolean, default: true },
    trackInventory: { type: Boolean, default: true },

    // ─── Media ─────────────────────────────────────────────────────────────
    images: [
      {
        url: String,
        altText: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    video3dUrl: { type: String, default: null },

    // ─── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'limited_edition'],
      default: 'active',
    },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    availableForSubscription: { type: Boolean, default: true },

    // ─── Nutrition ─────────────────────────────────────────────────────────
    nutrition: nutritionSchema,

    // ─── Reviews ───────────────────────────────────────────────────────────
    reviews: [reviewSchema],
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    // ─── Metadata ──────────────────────────────────────────────────────────
    stripeProductId: { type: String, select: false },
    stripePriceId: { type: String, select: false },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
productSchema.index({ slug: 1 });
productSchema.index({ status: 1, category: 1 });
productSchema.index({ isFeatured: 1, isBestSeller: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

productSchema.virtual('subscriptionPrice').get(function () {
  return +(this.price * (1 - this.subscriptionDiscount)).toFixed(2);
});

// ─── Pre-save: generate slug ──────────────────────────────────────────────────
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ─── Pre-save: update stock status ────────────────────────────────────────────
productSchema.pre('save', function (next) {
  if (this.trackInventory) {
    this.isInStock = this.stock > 0;
  }
  next();
});

// ─── Static: recalculate average rating ───────────────────────────────────────
productSchema.methods.recalcRating = function () {
  if (!this.reviews.length) {
    this.avgRating = 0;
    this.reviewCount = 0;
    return;
  }
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.avgRating = +(sum / this.reviews.length).toFixed(1);
  this.reviewCount = this.reviews.length;
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
