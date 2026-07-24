const { pool } = require('../config/db');

class Category {
    // Create a new category
    static async create(categoryData) {
        const { name, description } = categoryData;
        const query = `
            INSERT INTO Category (name, description)
            VALUES (?, ?)
        `;
        const [result] = await pool.execute(query, [name, description || null]);
        return result.insertId;
    }

    // Get all categories, alphabetically
    static async getAll() {
        const query = 'SELECT * FROM Category ORDER BY name ASC';
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Get a single category by ID
    static async findById(category_id) {
        const query = 'SELECT * FROM Category WHERE category_id = ?';
        const [rows] = await pool.execute(query, [category_id]);
        return rows[0] || null;
    }

    // Find a category by name (used to prevent duplicates, case-insensitive)
    static async findByName(name) {
        const query = 'SELECT * FROM Category WHERE LOWER(name) = LOWER(?)';
        const [rows] = await pool.execute(query, [name]);
        return rows[0] || null;
    }

    // Update a category
    static async update(category_id, updateData) {
        const allowedFields = ['name', 'description'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) return null;

        values.push(category_id);
        const query = `UPDATE Category SET ${updates.join(', ')} WHERE category_id = ?`;
        const [result] = await pool.execute(query, values);
        return result;
    }

    // Delete a category
    static async delete(category_id) {
        const query = 'DELETE FROM Category WHERE category_id = ?';
        const [result] = await pool.execute(query, [category_id]);
        return result;
    }
}

module.exports = Category;