'use strict';

/**
 * APIFeatures — Chainable query builder for Mongoose.
 *
 * Supports: filter, sort, field projection, pagination, and full-text search.
 *
 * Usage:
 *   const features = new APIFeatures(Model.find(), req.query)
 *     .filter()
 *     .sort()
 *     .limitFields()
 *     .paginate()
 *     .search();
 *   const docs = await features.query;
 */
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * filter()
   * Supports:
   *   ?category=jelly
   *   ?price[gte]=10&price[lte]=50
   *   ?isFeatured=true
   */
  filter() {
    const queryObj = { ...this.queryString };

    // Remove reserved query params
    const excluded = ['page', 'sort', 'limit', 'fields', 'q'];
    excluded.forEach((el) => delete queryObj[el]);

    // Convert operators: gte, gt, lte, lt → MongoDB $gte etc.
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * sort()
   * ?sort=price → ascending by price
   * ?sort=-price → descending by price
   * ?sort=-avgRating,price → multiple fields
   * Default: newest first
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * limitFields()
   * ?fields=name,price,images → only return those fields
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // Always exclude __v
    }
    return this;
  }

  /**
   * paginate()
   * ?page=2&limit=20
   * Default: page 1, limit 12
   */
  paginate() {
    const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.min(parseInt(this.queryString.limit, 10) || 12, 100);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  /**
   * search()
   * ?q=chocolate sea salt
   * Uses MongoDB text index on the model
   */
  search() {
    if (this.queryString.q && this.queryString.q.trim()) {
      this.query = this.query.find(
        { $text: { $search: this.queryString.q } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
    }
    return this;
  }
}

module.exports = APIFeatures;
