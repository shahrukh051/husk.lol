'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { paginationRules, validate } = require('../middleware/validators');

router.use(protect);

// ─── Self-service ─────────────────────────────────────────────────────────────
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.delete('/me', userController.deleteMe);
router.post('/me/addresses', userController.addAddress);
router.patch('/me/addresses/:addressId', userController.updateAddress);
router.delete('/me/addresses/:addressId', userController.deleteAddress);
router.patch('/me/preferences', userController.updatePreferences);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

router.get('/', paginationRules, validate, userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
