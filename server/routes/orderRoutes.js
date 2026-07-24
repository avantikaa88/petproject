const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, isAdmin } = require('../middleware/auth');

// Admin routes (placed above "/:id" so "admin/all" isn't caught by it)
router.get('/admin/all', protect, isAdmin, orderController.getAllOrders);

// Customer routes
router.post('/', protect, orderController.createOrder);
router.get('/', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);

// Admin action
router.put('/:id/status', protect, isAdmin, orderController.updateOrderStatus);

module.exports = router;