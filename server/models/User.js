const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    // Create a new user
    static async create(userData) {
        const {
            full_name,
            email,
            username,
            password,
            phone_number,
            address,
            gender,
            date_of_birth
        } = userData;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO User (
                full_name, email, username, password,
                phone_number, address, gender, date_of_birth
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            full_name,
            email,
            username,
            hashedPassword,
            phone_number || null,
            address || null,
            gender || null,
            date_of_birth || null
        ];

        const [result] = await pool.execute(query, values);

        return {
            user_id: result.insertId,
            full_name,
            email,
            username,
            phone_number,
            address,
            gender,
            date_of_birth,
            role: 'customer'
        };
    }

    // Find user by email or username (used for login -- includes password hash)
    static async findByEmailOrUsername(identifier) {
        const query = `SELECT * FROM User WHERE email = ? OR username = ?`;
        const [rows] = await pool.execute(query, [identifier, identifier]);
        return rows[0] || null;
    }

    // Find user by ID (no password returned)
    static async findById(userId) {
        const query = `
            SELECT user_id, full_name, email, username,
                   phone_number, address, gender, date_of_birth, role, created_at
            FROM User WHERE user_id = ?
        `;
        const [rows] = await pool.execute(query, [userId]);
        return rows[0] || null;
    }

    // Get all users (for admin dashboard)
    static async getAll() {
        const query = `
            SELECT user_id, full_name, email, username,
                   phone_number, address, gender, role, created_at
            FROM User ORDER BY created_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Update user profile
    static async update(userId, updateData) {
        const allowedFields = ['full_name', 'phone_number', 'address', 'gender', 'date_of_birth'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) return null;

        values.push(userId);
        const query = `UPDATE User SET ${updates.join(', ')} WHERE user_id = ?`;
        const [result] = await pool.execute(query, values);
        return result;
    }

    // Delete a user (admin action)
    static async delete(userId) {
        const query = 'DELETE FROM User WHERE user_id = ?';
        const [result] = await pool.execute(query, [userId]);
        return result;
    }

    static async emailExists(email) {
        const [rows] = await pool.execute('SELECT user_id FROM User WHERE email = ?', [email]);
        return rows.length > 0;
    }

    static async usernameExists(username) {
        const [rows] = await pool.execute('SELECT user_id FROM User WHERE username = ?', [username]);
        return rows.length > 0;
    }

    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;