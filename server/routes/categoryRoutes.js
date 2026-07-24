const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only routes
router.post('/', protect, isAdmin, categoryController.createCategory);
router.put('/:id', protect, isAdmin, categoryController.updateCategory);
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);

module.exports = router;