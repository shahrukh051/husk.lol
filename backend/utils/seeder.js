'use strict';

/**
 * Database Seeder
 * Seeds realistic sample data for development and testing.
 *
 * Usage:
 *   node src/utils/seeder.js          → seed database
 *   node src/utils/seeder.js --reset  → wipe and re-seed
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Partner = require('../models/Partner');
const logger = require('../config/logger');

// ─── Seed Data ────────────────────────────────────────────────────────────────

const users = [
  {
    firstName: 'Alex',
    lastName: 'Curator',
    email: 'admin@velvethusk.com',
    password: 'Admin1234!',
    role: 'admin',
    membershipTier: 'golden',
    isEmailVerified: true,
    ritualPoints: 5000,
    ritualStreak: 42,
  },
  {
    firstName: 'Mira',
    lastName: 'Solène',
    email: 'mira@example.com',
    password: 'User1234!',
    role: 'customer',
    membershipTier: 'alchemist',
    isEmailVerified: true,
    ritualPoints: 1240,
    ritualStreak: 7,
  },
  {
    firstName: 'Jordan',
    lastName: 'Flux',
    email: 'jordan@example.com',
    password: 'User1234!',
    role: 'partner',
    membershipTier: 'alchemist',
    isEmailVerified: true,
    ritualPoints: 890,
    ritualStreak: 3,
  },
];

const products = [
  {
    name: 'Dark Chocolate & Sea Salt Husk Jelly',
    tagline: 'Focus. Indulge. Restore.',
    description: 'Our most popular blend. Deep cocoa warmth balanced with Himalayan sea salt and pure psyllium husk. Perfect for the midweek reset.',
    category: 'jelly',
    flavorProfile: 'chocolate',
    flavorNotes: ['dark chocolate', 'sea salt', 'earthy', 'warm'],
    dietaryFlags: ['vegan', 'gluten-free', 'non-gmo'],
    price: 28.00,
    compareAtPrice: 34.00,
    stock: 250,
    isFeatured: true,
    isBestSeller: true,
    availableForSubscription: true,
    status: 'active',
    sortOrder: 1,
    nutrition: {
      servingSize: '1 tablespoon (15g)',
      calories: 35,
      dietaryFiber: 4,
      protein: 1,
      totalCarbohydrates: 8,
      psylliumHusk: 4.5,
    },
    images: [{ url: 'https://example.com/products/dark-choc.jpg', altText: 'Dark Chocolate Sea Salt Jelly', isPrimary: true }],
  },
  {
    name: 'Citrus & Ginger Morning Ritual',
    tagline: 'Rise. Energise. Conquer.',
    description: 'A zingy, vibrant blend of cold-pressed citrus and warming ginger root. Your morning ritual starts here.',
    category: 'jelly',
    flavorProfile: 'citrus',
    flavorNotes: ['lemon', 'orange zest', 'ginger', 'bright'],
    dietaryFlags: ['vegan', 'gluten-free', 'organic'],
    price: 26.00,
    stock: 180,
    isFeatured: true,
    availableForSubscription: true,
    status: 'active',
    sortOrder: 2,
    nutrition: {
      servingSize: '1 tablespoon (15g)',
      calories: 30,
      dietaryFiber: 4,
      protein: 0,
      totalCarbohydrates: 7,
      psylliumHusk: 4.5,
    },
    images: [{ url: 'https://example.com/products/citrus.jpg', altText: 'Citrus Ginger Jelly', isPrimary: true }],
  },
  {
    name: 'Rose & Cardamom Weekend Luxe',
    tagline: 'Slow down. Breathe. Bloom.',
    description: 'A luxurious, floral experience. Bulgarian rose water and green cardamom meet psyllium for the ultimate weekend ritual.',
    category: 'jelly',
    flavorProfile: 'floral',
    flavorNotes: ['rose', 'cardamom', 'vanilla whisper', 'floral'],
    dietaryFlags: ['vegan', 'gluten-free'],
    price: 32.00,
    compareAtPrice: 38.00,
    stock: 120,
    isFeatured: true,
    isNewArrival: true,
    availableForSubscription: true,
    status: 'active',
    sortOrder: 3,
    nutrition: {
      servingSize: '1 tablespoon (15g)',
      calories: 33,
      dietaryFiber: 4,
      protein: 1,
      totalCarbohydrates: 7,
      psylliumHusk: 4.5,
    },
    images: [{ url: 'https://example.com/products/rose.jpg', altText: 'Rose Cardamom Jelly', isPrimary: true }],
  },
  {
    name: 'Matcha & Mint Focus Stack',
    tagline: 'Clarity. Precision. Flow.',
    description: 'Ceremonial grade Japanese matcha and peppermint extract combined with psyllium for clean, sustained focus.',
    category: 'jelly',
    flavorProfile: 'herbal',
    flavorNotes: ['matcha', 'fresh mint', 'grassy', 'clean'],
    dietaryFlags: ['vegan', 'gluten-free', 'keto', 'non-gmo'],
    price: 30.00,
    stock: 200,
    isBestSeller: true,
    availableForSubscription: true,
    status: 'active',
    sortOrder: 4,
    nutrition: {
      servingSize: '1 tablespoon (15g)',
      calories: 32,
      dietaryFiber: 4,
      protein: 1,
      totalCarbohydrates: 6,
      psylliumHusk: 4.5,
    },
    images: [{ url: 'https://example.com/products/matcha.jpg', altText: 'Matcha Mint Jelly', isPrimary: true }],
  },
  {
    name: 'Tropical Mango Friday Bundle',
    tagline: 'Celebrate every day.',
    description: 'A 3-pack celebration bundle. Alphonso mango, passion fruit, and coconut water meet pure psyllium in a tropical escape.',
    category: 'bundle',
    flavorProfile: 'tropical',
    flavorNotes: ['mango', 'passion fruit', 'coconut', 'bright'],
    dietaryFlags: ['vegan', 'gluten-free', 'sugar-free'],
    price: 75.00,
    compareAtPrice: 90.00,
    stock: 60,
    isFeatured: true,
    availableForSubscription: false,
    status: 'active',
    sortOrder: 5,
    images: [{ url: 'https://example.com/products/mango.jpg', altText: 'Tropical Bundle', isPrimary: true }],
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB for seeding');

    if (process.argv.includes('--reset')) {
      await Promise.all([
        User.deleteMany(),
        Product.deleteMany(),
        Order.deleteMany(),
        Subscription.deleteMany(),
        Partner.deleteMany(),
      ]);
      logger.info('All collections cleared');
    }

    // Create users
    const createdUsers = await User.create(users);
    logger.info(`Created ${createdUsers.length} users`);

    // Create products
    const createdProducts = await Product.create(products);
    logger.info(`Created ${createdProducts.length} products`);

    // Create a sample partner for Jordan
    const jordan = createdUsers.find((u) => u.email === 'jordan@example.com');
    const partner = await Partner.create({
      user: jordan._id,
      businessName: 'Flux Wellness',
      bio: 'Health enthusiast sharing the power of gut wellness.',
      niche: 'wellness',
      audienceSize: 15000,
      status: 'approved',
      approvedAt: new Date(),
      totalReferrals: 28,
      totalRevenue: 3240.00,
      totalEarnings: 486.00,
      pendingPayout: 122.50,
      lifetimePayout: 363.50,
    });
    logger.info(`Created partner: ${partner.referralCode}`);

    // Create a sample subscription for Mira
    const mira = createdUsers.find((u) => u.email === 'mira@example.com');
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await Subscription.create({
      user: mira._id,
      plan: 'monthly',
      selectedProducts: [
        { product: createdProducts[0]._id, quantity: 2 },
        { product: createdProducts[3]._id, quantity: 1 },
      ],
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      nextBillingDate: nextMonth,
      deliveryAddress: {
        line1: '42 Ritual Lane',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
      },
      totalOrdersCount: 3,
      totalSpent: 252.00,
    });
    logger.info('Created sample subscription');

    // Create a sample order
    await Order.create({
      user: mira._id,
      items: [
        { product: createdProducts[0]._id, name: createdProducts[0].name, price: 28.00, quantity: 2 },
        { product: createdProducts[1]._id, name: createdProducts[1].name, price: 26.00, quantity: 1 },
      ],
      subtotal: 82.00,
      shippingCost: 0,
      taxAmount: 6.56,
      total: 88.56,
      status: 'delivered',
      paymentStatus: 'paid',
      shippingAddress: {
        fullName: 'Mira Solène',
        line1: '42 Ritual Lane',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
      },
      statusHistory: [
        { status: 'pending', note: 'Order created' },
        { status: 'confirmed', note: 'Payment confirmed' },
        { status: 'shipped', note: 'Shipped via FedEx', timestamp: new Date(Date.now() - 86400000 * 2) },
        { status: 'delivered', note: 'Delivered', timestamp: new Date(Date.now() - 86400000) },
      ],
    });
    logger.info('Created sample order');

    logger.info('✅ Seeding complete!');
    logger.info('\nTest Credentials:');
    logger.info('  Admin:   admin@velvethusk.com / Admin1234!');
    logger.info('  User:    mira@example.com / User1234!');
    logger.info('  Partner: jordan@example.com / User1234!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
