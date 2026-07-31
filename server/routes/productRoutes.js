const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', productController.getProducts);

// Admin-only routes
// NOTE: must be registered before '/:id' so "admin" isn't parsed as an id.
router.get('/admin/all', protect, isAdmin, productController.getProductsForAdmin);
router.post('/', protect, isAdmin, productController.createProduct);
router.put('/:id', protect, isAdmin, productController.updateProduct);
router.patch('/:id/restore', protect, isAdmin, productController.restoreProduct);
router.delete('/:id', protect, isAdmin, productController.deleteProduct);

router.get('/:id', productController.getProductById);

module.exports = router;