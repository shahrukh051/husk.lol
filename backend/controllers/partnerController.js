'use strict';

const Partner = require('../models/Partner');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * POST /api/v1/partners/apply
 * Submit a partner application
 */
exports.apply = catchAsync(async (req, res, next) => {
  // Check if user already has an application
  const existing = await Partner.findOne({ user: req.user.id });
  if (existing) {
    return next(new AppError('You have already submitted a partner application', 409));
  }

  const partner = await Partner.create({
    user: req.user.id,
    businessName: req.body.businessName,
    bio: req.body.bio,
    website: req.body.website,
    socialHandles: req.body.socialHandles,
    audienceSize: req.body.audienceSize,
    niche: req.body.niche,
  });

  // Notify admin of new application
  emailService.sendPartnerApplicationAlert(partner).catch((err) =>
    logger.error('Partner application alert email failed:', err)
  );

  res.status(201).json({
    status: 'success',
    message: 'Application submitted! Our team will review within 48 hours.',
    data: { partner },
  });
});

/**
 * GET /api/v1/partners/me
 * Get current user's partner profile and stats
 */
exports.getMyPartnerProfile = catchAsync(async (req, res, next) => {
  const partner = await Partner.findOne({ user: req.user.id }).populate(
    'user',
    'firstName lastName email avatar membershipTier'
  );

  if (!partner) {
    return next(new AppError('No partner profile found. Please apply first.', 404));
  }

  res.status(200).json({ status: 'success', data: { partner } });
});

/**
 * PATCH /api/v1/partners/me
 * Update partner profile
 */
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  // Only allow safe fields to be updated by the partner themselves
  const allowedFields = [
    'businessName', 'bio', 'website', 'socialHandles', 'audienceSize', 'niche'
  ];
  const filteredBody = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) filteredBody[field] = req.body[field];
  });

  const partner = await Partner.findOneAndUpdate(
    { user: req.user.id },
    filteredBody,
    { new: true, runValidators: true }
  );

  if (!partner) {
    return next(new AppError('Partner profile not found', 404));
  }

  res.status(200).json({ status: 'success', data: { partner } });
});

/**
 * GET /api/v1/partners/me/dashboard
 * Get partner's earnings, referral stats, commission history
 */
exports.getPartnerDashboard = catchAsync(async (req, res, next) => {
  const partner = await Partner.findOne({ user: req.user.id })
    .populate('commissionHistory.order', 'orderNumber total createdAt');

  if (!partner) {
    return next(new AppError('Partner profile not found', 404));
  }

  // Compute monthly earnings breakdown (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyBreakdown = partner.commissionHistory
    .filter((c) => new Date(c.createdAt) > sixMonthsAgo)
    .reduce((acc, c) => {
      const month = new Date(c.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      acc[month] = (acc[month] || 0) + c.amount;
      return acc;
    }, {});

  res.status(200).json({
    status: 'success',
    data: {
      partner: {
        referralCode: partner.referralCode,
        referralLink: partner.referralLink,
        tier: partner.tier,
        status: partner.status,
        commissionRate: partner.commissionRate,
        stats: {
          totalReferrals: partner.totalReferrals,
          totalRevenue: partner.totalRevenue,
          totalEarnings: partner.totalEarnings,
          pendingPayout: partner.pendingPayout,
          lifetimePayout: partner.lifetimePayout,
        },
        monthlyBreakdown,
        recentCommissions: partner.commissionHistory.slice(-10).reverse(),
        isGoldenEligible: partner.isGoldenEligible,
      },
    },
  });
});

/**
 * GET /api/v1/partners/leaderboard (public)
 * Top partners by revenue (anonymised)
 */
exports.getLeaderboard = catchAsync(async (req, res) => {
  const leaders = await Partner.find({ status: 'approved' })
    .sort({ totalRevenue: -1 })
    .limit(10)
    .populate('user', 'firstName avatar')
    .select('tier totalRevenue totalReferrals user');

  res.status(200).json({ status: 'success', data: { leaders } });
});

// ─── Admin Controllers ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/partners (admin only)
 */
exports.getAllPartners = catchAsync(async (req, res) => {
  const { status, tier, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (tier) filter.tier = tier;

  const partners = await Partner.find(filter)
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10));

  const total = await Partner.countDocuments(filter);

  res.status(200).json({ status: 'success', total, data: { partners } });
});

/**
 * PATCH /api/v1/partners/:id/approve (admin only)
 */
exports.approvePartner = catchAsync(async (req, res, next) => {
  const partner = await Partner.findByIdAndUpdate(
    req.params.id,
    {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user.id,
    },
    { new: true }
  ).populate('user', 'firstName lastName email');

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  // Update user role
  await User.findByIdAndUpdate(partner.user._id, { role: 'partner' });

  // Send approval email
  emailService.sendPartnerApproval(partner).catch((err) =>
    logger.error('Partner approval email failed:', err)
  );

  res.status(200).json({ status: 'success', data: { partner } });
});

/**
 * PATCH /api/v1/partners/:id/reject (admin only)
 */
exports.rejectPartner = catchAsync(async (req, res, next) => {
  const partner = await Partner.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  );

  if (!partner) {
    return next(new AppError('Partner not found', 404));
  }

  res.status(200).json({ status: 'success', data: { partner } });
});
