const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET /api/cart  (requires token)
exports.getCart = async (req, res) => {
    try {
        const items = await Cart.getByUser(req.user.userId);
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        res.status(200).json({ success: true, items, total });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// POST /api/cart  { product_id, quantity }  (requires token)
exports.addToCart = async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const requestedQty = Number(quantity) || 1;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'product_id is required' });
        }
        if (requestedQty < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const stock = Number(product.stock);
        const alreadyInCart = await Cart.getItemQuantity(req.user.userId, product_id);
        const remainingCapacity = stock - alreadyInCart;

        if (remainingCapacity <= 0) {
            return res.status(400).json({
                success: false,
                message: alreadyInCart > 0
                    ? `You already have all ${stock} available in your cart.`
                    : 'This product is out of stock.'
            });
        }

        // Cap the add so the cart can never exceed what's actually in stock,
        // even if the front end's own limit was somehow bypassed.
        const qtyToAdd = Math.min(requestedQty, remainingCapacity);

        await Cart.addItem(req.user.userId, product_id, qtyToAdd);

        const wasCapped = qtyToAdd < requestedQty;
        res.status(200).json({
            success: true,
            message: wasCapped
                ? `Only ${qtyToAdd} could be added — that's all the stock we have left.`
                : 'Item added to cart',
            capped: wasCapped,
            quantity_added: qtyToAdd
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PUT /api/cart/:cartId  { quantity }  (requires token)
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const requestedQty = Number(quantity);
        if (!requestedQty || requestedQty < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        const cartItem = await Cart.getItemById(req.params.cartId, req.user.userId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        const stock = Number(cartItem.stock);
        if (requestedQty > stock) {
            return res.status(400).json({
                success: false,
                message: stock > 0
                    ? `Only ${stock} left in stock.`
                    : 'This product is out of stock.'
            });
        }

        await Cart.updateQuantity(req.params.cartId, req.user.userId, requestedQty);
        res.status(200).json({ success: true, message: 'Cart updated' });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// DELETE /api/cart/:cartId  (requires token)
exports.removeCartItem = async (req, res) => {
    try {
        await Cart.removeItem(req.params.cartId, req.user.userId);
        res.status(200).json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};