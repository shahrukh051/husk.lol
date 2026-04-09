'use strict';

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/me', dashboardController.getUserDashboard);
router.get('/admin', restrictTo('admin'), dashboardController.getAdminDashboard);

module.exports = router;
