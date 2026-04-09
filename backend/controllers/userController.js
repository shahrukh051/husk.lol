'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const filterObj = (obj, ...allowedFields) => {
  const filtered = {};
  allowedFields.forEach((field) => {
    if (obj[field] !== undefined) filtered[field] = obj[field];
  });
  return filtered;
};

// ─── Self-service Controllers ─────────────────────────────────────────────────

exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).populate('referredBy', 'firstName lastName');
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Disallow password/role updates here
  if (req.body.password || req.body.role) {
    return next(new AppError('This route is not for password or role updates.', 400));
  }

  const allowed = filterObj(req.body, 'firstName', 'lastName', 'avatar');

  const user = await User.findByIdAndUpdate(req.user.id, allowed, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { user } });
});

exports.deleteMe = catchAsync(async (req, res) => {
  // Soft delete — mark inactive, not permanent
  await User.findByIdAndUpdate(req.user.id, { isActive: false });
  res.status(204).json({ status: 'success', data: null });
});

exports.addAddress = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);

  // If set as default, clear existing defaults
  if (req.body.isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  user.addresses.push(req.body);
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ status: 'success', data: { addresses: user.addresses } });
});

exports.updateAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  if (req.body.isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  Object.assign(address, req.body);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { addresses: user.addresses } });
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  address.deleteOne();
  await user.save({ validateBeforeSave: false });

  res.status(204).json({ status: 'success', data: null });
});

exports.updatePreferences = catchAsync(async (req, res) => {
  const allowed = filterObj(
    req.body,
    'emailNotifications',
    'smsNotifications',
    'flavorProfile',
    'dietaryFlags'
  );

  const update = {};
  Object.keys(allowed).forEach((k) => {
    update[`preferences.${k}`] = allowed[k];
  });

  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { preferences: user.preferences } });
});

// ─── Admin Controllers ─────────────────────────────────────────────────────────

exports.getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, tier } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (tier) filter.membershipTier = tier;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10));

  const total = await User.countDocuments(filter);

  res.status(200).json({ status: 'success', total, data: { users } });
});

exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).setOptions({ includeInactive: true });
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const allowed = filterObj(req.body, 'role', 'membershipTier', 'isActive', 'ritualPoints');
  const user = await User.findByIdAndUpdate(req.params.id, allowed, {
    new: true,
    runValidators: true,
  }).setOptions({ includeInactive: true });

  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  // Hard delete — admin use only
  const user = await User.findByIdAndDelete(req.params.id).setOptions({ includeInactive: true });
  if (!user) return next(new AppError('User not found', 404));
  res.status(204).json({ status: 'success', data: null });
});
