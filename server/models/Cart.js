const { pool } = require('../config/db');

class Cart {
    // Add a product to the cart, or increase quantity if it's already there
    static async addItem(user_id, product_id, quantity = 1) {
        const query = `
            INSERT INTO Cart (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `;
        const [result] = await pool.execute(query, [user_id, product_id, quantity]);
        return result;
    }

    // Get the quantity a user already has of a given product in their cart
    // (0 if it isn't in there yet). Used to cap adds against stock.
    static async getItemQuantity(user_id, product_id) {
        const query = 'SELECT quantity FROM Cart WHERE user_id = ? AND product_id = ?';
        const [rows] = await pool.execute(query, [user_id, product_id]);
        return rows.length ? rows[0].quantity : 0;
    }

    // Get a single cart item (with its product's current stock) so we can
    // validate a quantity update against real stock levels.
    static async getItemById(cart_id, user_id) {
        const query = `
            SELECT c.cart_id, c.quantity, p.product_id, p.stock
            FROM Cart c
            JOIN Product p ON c.product_id = p.product_id
            WHERE c.cart_id = ? AND c.user_id = ?
        `;
        const [rows] = await pool.execute(query, [cart_id, user_id]);
        return rows.length ? rows[0] : null;
    }

    // Get all cart items for a user, joined with product details
    static async getByUser(user_id) {
        const query = `
            SELECT c.cart_id, c.quantity, p.product_id, p.name, p.price, p.image_url, p.stock
            FROM Cart c
            JOIN Product p ON c.product_id = p.product_id
            WHERE c.user_id = ?
        `;
        const [rows] = await pool.execute(query, [user_id]);
        return rows;
    }

    // Update the quantity of a specific cart item
    static async updateQuantity(cart_id, user_id, quantity) {
        const query = 'UPDATE Cart SET quantity = ? WHERE cart_id = ? AND user_id = ?';
        const [result] = await pool.execute(query, [quantity, cart_id, user_id]);
        return result;
    }

    // Remove a single item from the cart
    static async removeItem(cart_id, user_id) {
        const query = 'DELETE FROM Cart WHERE cart_id = ? AND user_id = ?';
        const [result] = await pool.execute(query, [cart_id, user_id]);
        return result;
    }

    // Empty the whole cart (called after an order is placed)
    static async clearCart(user_id) {
        const query = 'DELETE FROM Cart WHERE user_id = ?';
        const [result] = await pool.execute(query, [user_id]);
        return result;
    }

    // Remove every cart line referencing a product, across all users.
    // Called right before that product is deleted so no one's cart is left
    // pointing at a product that's about to stop existing.
    static async removeByProduct(product_id) {
        const query = 'DELETE FROM Cart WHERE product_id = ?';
        const [result] = await pool.execute(query, [product_id]);
        return result;
    }
}

module.exports = Cart;