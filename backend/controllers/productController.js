'use strict';

const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/APIFeatures');

/**
 * GET /api/v1/products
 * Supports: filtering, sorting, field selection, pagination, full-text search
 */
exports.getAllProducts = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Product.find({ status: 'active' }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .search();

  const [products, total] = await Promise.all([
    features.query,
    Product.countDocuments({ status: 'active' }),
  ]);

  res.status(200).json({
    status: 'success',
    results: products.length,
    total,
    page: parseInt(req.query.page, 10) || 1,
    data: { products },
  });
});

/**
 * GET /api/v1/products/featured
 */
exports.getFeaturedProducts = catchAsync(async (req, res) => {
  const products = await Product.find({ isFeatured: true, status: 'active' })
    .sort({ sortOrder: 1 })
    .limit(6);

  res.status(200).json({ status: 'success', data: { products } });
});

/**
 * GET /api/v1/products/best-sellers
 */
exports.getBestSellers = catchAsync(async (req, res) => {
  const products = await Product.find({ isBestSeller: true, status: 'active' })
    .sort({ avgRating: -1 })
    .limit(8);

  res.status(200).json({ status: 'success', data: { products } });
});

/**
 * GET /api/v1/products/:slug
 */
exports.getProductBySlug = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug, status: 'active' });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({ status: 'success', data: { product } });
});

/**
 * GET /api/v1/products/:id
 */
exports.getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({ status: 'success', data: { product } });
});

/**
 * POST /api/v1/products (admin only)
 */
exports.createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ status: 'success', data: { product } });
});

/**
 * PATCH /api/v1/products/:id (admin only)
 */
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({ status: 'success', data: { product } });
});

/**
 * DELETE /api/v1/products/:id (admin only — soft delete)
 */
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { status: 'archived' },
    { new: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

/**
 * POST /api/v1/products/:id/reviews (authenticated)
 */
exports.addReview = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check if user already reviewed this product
  const alreadyReviewed = product.reviews.some(
    (r) => r.user.toString() === req.user.id
  );

  if (alreadyReviewed) {
    return next(new AppError('You have already reviewed this product', 409));
  }

  product.reviews.push({
    user: req.user.id,
    rating: req.body.rating,
    title: req.body.title,
    body: req.body.body,
  });

  product.recalcRating();
  await product.save();

  res.status(201).json({ status: 'success', data: { reviews: product.reviews } });
});

/**
 * GET /api/v1/products/search?q=...
 */
exports.searchProducts = catchAsync(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(200).json({ status: 'success', data: { products: [] } });
  }

  const products = await Product.find(
    {
      $text: { $search: q },
      status: 'active',
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10);

  res.status(200).json({ status: 'success', results: products.length, data: { products } });
});
