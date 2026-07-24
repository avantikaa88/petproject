const { pool } = require('../config/db');

class Product {
    // Create a new product
    static async create(productData) {
        const { name, description, price, category, stock, image_url, seller_id } = productData;
        const query = `
            INSERT INTO Product (name, description, price, category, stock, image_url, seller_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            name, description, price, category, stock || 0, image_url || null, seller_id || null
        ]);
        return result.insertId;
    }

    // Get all products with optional filters (category, price range, search text)
    static async getAll(filters = {}) {
        let query = 'SELECT * FROM Product WHERE 1=1';
        const values = [];

        if (filters.category) {
            query += ' AND category = ?';
            values.push(filters.category);
        }

        if (filters.minPrice) {
            query += ' AND price >= ?';
            values.push(filters.minPrice);
        }

        if (filters.maxPrice) {
            query += ' AND price <= ?';
            values.push(filters.maxPrice);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            values.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(query, values);
        return rows;
    }

    // Get a single product by ID
    static async findById(product_id) {
        const query = 'SELECT * FROM Product WHERE product_id = ?';
        const [rows] = await pool.execute(query, [product_id]);
        return rows[0] || null;
    }

    // Update a product
    static async update(product_id, updateData) {
        const allowedFields = ['name', 'description', 'price', 'category', 'stock', 'image_url'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) return null;

        values.push(product_id);
        const query = `UPDATE Product SET ${updates.join(', ')} WHERE product_id = ?`;
        const [result] = await pool.execute(query, values);
        return result;
    }

    // Delete a product
    static async delete(product_id) {
        const query = 'DELETE FROM Product WHERE product_id = ?';
        const [result] = await pool.execute(query, [product_id]);
        return result;
    }

    // Reduce stock (used when an order is placed). Fails safely if not enough stock.
    static async reduceStock(product_id, quantity) {
        const query = 'UPDATE Product SET stock = stock - ? WHERE product_id = ? AND stock >= ?';
        const [result] = await pool.execute(query, [quantity, product_id, quantity]);
        return result; // result.affectedRows === 0 means "not enough stock"
    }
}

module.exports = Product;