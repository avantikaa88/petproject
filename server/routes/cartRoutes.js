const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Every cart route requires a logged-in user
router.use(protect);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:cartId', cartController.updateCartItem);
router.delete('/:cartId', cartController.removeCartItem);

module.exports = router;