const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/auth');

// Logged-in user's own profile
router.get('/me', protect, userController.getMe);
router.put('/me', protect, userController.updateMe);

// Admin-only: manage all users
router.get('/', protect, isAdmin, userController.getAllUsers);
router.patch('/:id/restore', protect, isAdmin, userController.restoreUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;