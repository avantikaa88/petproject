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
    // By default, soft-deleted products are excluded. Pass includeDeleted:
    // true to include them too (e.g. for admin tooling that needs to see
    // everything).
    static async getAll(filters = {}) {
        let query = 'SELECT * FROM Product WHERE 1=1';
        const values = [];

        if (!filters.includeDeleted) {
            query += ' AND is_deleted = 0';
        }

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

    // Get a single product by ID. Soft-deleted products are treated as not
    // found unless includeDeleted is passed (used internally by the delete
    // flow itself, which needs to look the product up before deleting it).
    static async findById(product_id, { includeDeleted = false } = {}) {
        const query = includeDeleted
            ? 'SELECT * FROM Product WHERE product_id = ?'
            : 'SELECT * FROM Product WHERE product_id = ? AND is_deleted = 0';
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

    // Soft-delete a product: it disappears from every product listing, but
    // the row itself stays put so existing orders (and any historical
    // reference to it) keep working. See migrations/002_soft_delete_products.sql.
    static async delete(product_id) {
        const query = 'UPDATE Product SET is_deleted = 1, deleted_at = NOW() WHERE product_id = ?';
        const [result] = await pool.execute(query, [product_id]);
        return result;
    }

    // Restore a previously soft-deleted product so it shows up in listings
    // again. The row (and its images) were never touched by the delete, so
    // this is just flipping the flag back.
    static async restore(product_id) {
        const query = 'UPDATE Product SET is_deleted = 0, deleted_at = NULL WHERE product_id = ?';
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