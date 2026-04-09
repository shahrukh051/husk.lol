'use strict';

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, createOrderRules, paginationRules } = require('../middleware/validators');

// All order routes require auth
router.use(protect);

// ─── Customer Routes ──────────────────────────────────────────────────────────
router.post('/', createOrderRules, validate, orderController.createOrder);
router.get('/my', paginationRules, validate, orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.patch('/:id/cancel', orderController.cancelOrder);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

router.get('/', paginationRules, validate, orderController.getAllOrders);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
