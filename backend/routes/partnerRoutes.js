'use strict';

const express = require('express');
const router = express.Router();

const partnerController = require('../controllers/partnerController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, partnerApplyRules, paginationRules } = require('../middleware/validators');

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get('/leaderboard', partnerController.getLeaderboard);

// ─── Authenticated Routes ─────────────────────────────────────────────────────
router.use(protect);

router.post('/apply', partnerApplyRules, validate, partnerController.apply);
router.get('/me', partnerController.getMyPartnerProfile);
router.patch('/me', partnerController.updateMyProfile);
router.get('/me/dashboard', partnerController.getPartnerDashboard);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

router.get('/', paginationRules, validate, partnerController.getAllPartners);
router.patch('/:id/approve', partnerController.approvePartner);
router.patch('/:id/reject', partnerController.rejectPartner);

module.exports = router;
