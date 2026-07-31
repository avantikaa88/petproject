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

    // Find user by email or username (used for login -- includes password hash).
    // Deliberately includes soft-deleted accounts: the login controller needs
    // to verify the password first and only then check is_deleted, so it can
    // show a clear "account deactivated" message instead of just failing
    // silently with a generic invalid-credentials error.
    static async findByEmailOrUsername(identifier) {
        const query = `SELECT * FROM User WHERE email = ? OR username = ?`;
        const [rows] = await pool.execute(query, [identifier, identifier]);
        return rows[0] || null;
    }

    // Find user by ID (no password returned). Soft-deleted accounts are
    // treated as not found unless includeDeleted is passed (used internally
    // by the admin delete/restore flow, which needs to look the user up
    // regardless of their current deleted state).
    static async findById(userId, { includeDeleted = false } = {}) {
        const query = includeDeleted
            ? `SELECT user_id, full_name, email, username,
                      phone_number, address, gender, date_of_birth, role,
                      is_deleted, deleted_at, created_at
               FROM User WHERE user_id = ?`
            : `SELECT user_id, full_name, email, username,
                      phone_number, address, gender, date_of_birth, role,
                      is_deleted, deleted_at, created_at
               FROM User WHERE user_id = ? AND is_deleted = 0`;
        const [rows] = await pool.execute(query, [userId]);
        return rows[0] || null;
    }

    // Get all users (for admin dashboard). By default, soft-deleted users
    // are excluded. Pass includeDeleted: true to include them too (so the
    // admin panel can list them and offer a restore option).
    static async getAll({ includeDeleted = false } = {}) {
        let query = `
            SELECT user_id, full_name, email, username,
                   phone_number, address, gender, role,
                   is_deleted, deleted_at, created_at
            FROM User
        `;
        if (!includeDeleted) {
            query += ' WHERE is_deleted = 0';
        }
        query += ' ORDER BY created_at DESC';
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

    // Soft-delete a user (admin action): the account disappears from login
    // and customer listings, but the row itself stays put so existing
    // orders (and any historical reference to it, e.g. Orders.user_id)
    // keep working instead of breaking or vanishing from admin reports.
    static async delete(userId) {
        const query = 'UPDATE User SET is_deleted = 1, deleted_at = NOW() WHERE user_id = ?';
        const [result] = await pool.execute(query, [userId]);
        return result;
    }

    // Restore a previously soft-deleted user account so it can log in and
    // show up in listings again. The row was never touched by the delete,
    // so this is just flipping the flag back.
    static async restore(userId) {
        const query = 'UPDATE User SET is_deleted = 0, deleted_at = NULL WHERE user_id = ?';
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