'use strict';

const User = require('../models/User');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/dashboard/me
 * Complete dashboard data for logged-in user in a single request
 */
exports.getUserDashboard = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Fetch all dashboard data in parallel
  const [user, recentOrders, subscription, featuredProducts, ritualStats] = await Promise.all([
    User.findById(userId),

    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product', 'name images slug'),

    Subscription.findOne({ user: userId, status: 'active' }).populate(
      'selectedProducts.product',
      'name images price slug'
    ),

    Product.find({ isFeatured: true, status: 'active' })
      .select('name slug images price subscriptionDiscount avgRating flavorProfile')
      .limit(4),

    // Ritual stats — daily streak info
    Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]),
  ]);

  // Compute ritual recommendation
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const recommendations = {
    Monday: 'Citrus & Ginger — energise your week',
    Tuesday: 'Matcha & Mint — sharp focus',
    Wednesday: 'Dark Chocolate & Sea Salt — midweek boost',
    Thursday: 'Lavender & Honey — calm before the storm',
    Friday: 'Tropical Mango — celebrate the week',
    Saturday: 'Rose & Cardamom — luxurious reset',
    Sunday: 'Vanilla & Chamomile — restore and reflect',
  };

  const stats = ritualStats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 };

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        fullName: user.fullName,
        firstName: user.firstName,
        avatar: user.avatar,
        membershipTier: user.membershipTier,
        ritualPoints: user.ritualPoints,
        ritualStreak: user.ritualStreak,
        isEmailVerified: user.isEmailVerified,
        referralCode: user.referralCode,
      },
      stats: {
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent.toFixed(2),
        avgOrderValue: stats.avgOrderValue ? stats.avgOrderValue.toFixed(2) : '0.00',
        ritualStreak: user.ritualStreak,
        ritualPoints: user.ritualPoints,
      },
      subscription: subscription
        ? {
            id: subscription._id,
            plan: subscription.plan,
            status: subscription.status,
            nextBillingDate: subscription.nextBillingDate,
            products: subscription.selectedProducts,
            totalOrdersCount: subscription.totalOrdersCount,
            discountRate: subscription.discountRate,
          }
        : null,
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        items: o.items,
        createdAt: o.createdAt,
      })),
      featuredProducts,
      ritualRecommendation: {
        day: today,
        text: recommendations[today] || 'Pick your potion',
      },
    },
  });
});

/**
 * GET /api/v1/dashboard/admin (admin only)
 * Platform-level analytics
 */
exports.getAdminDashboard = catchAsync(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    totalOrders,
    revenueStats,
    activeSubscriptions,
    topProducts,
    ordersByStatus,
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

    Order.countDocuments({ status: { $ne: 'cancelled' } }),

    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          thisMonth: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, '$total', 0],
            },
          },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]),

    Subscription.countDocuments({ status: 'active' }),

    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $project: { 'product.name': 1, 'product.slug': 1, totalSold: 1, totalRevenue: 1 } },
    ]),

    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const revenue = revenueStats[0] || { totalRevenue: 0, thisMonth: 0, avgOrderValue: 0 };

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        totalUsers,
        newUsersThisMonth,
        totalOrders,
        activeSubscriptions,
        totalRevenue: revenue.totalRevenue.toFixed(2),
        revenueThisMonth: revenue.thisMonth.toFixed(2),
        avgOrderValue: revenue.avgOrderValue ? revenue.avgOrderValue.toFixed(2) : '0.00',
      },
      topProducts,
      ordersByStatus: ordersByStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    },
  });
});
