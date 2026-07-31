const User = require('../models/User');

// GET /api/users/me  (requires token)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PUT /api/users/me  (requires token) - update own profile
exports.updateMe = async (req, res) => {
    try {
        const result = await User.update(req.user.userId, req.body);
        if (!result) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }
        const user = await User.findById(req.user.userId);
        res.status(200).json({ success: true, message: 'Profile updated', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// GET /api/users  (admin only) - list all users
// Includes soft-deleted users so the admin panel can show them (dimmed,
// with a restore option) instead of just losing track of them.
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll({ includeDeleted: true });
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// DELETE /api/users/:id  (admin only)
// Soft-deletes the user: their row (and every order, order item, and
// image referenced in their order history) is left completely untouched,
// so past orders keep displaying correctly. The account just can no
// longer log in or show up in listings until it's restored.
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id, { includeDeleted: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted' });
        }

        if (user.is_deleted) {
            return res.status(400).json({ success: false, message: 'User is already deleted' });
        }

        await User.delete(req.params.id);
        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PATCH /api/users/:id/restore  (admin only)
// Un-deletes a soft-deleted user account so they can log in and appear in
// listings again. Their order history was never hidden or altered in the
// first place, so there's nothing to reattach.
exports.restoreUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id, { includeDeleted: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.is_deleted) {
            return res.status(400).json({ success: false, message: 'User is not deleted' });
        }

        await User.restore(req.params.id);
        res.status(200).json({ success: true, message: 'User restored' });
    } catch (error) {
        console.error('Restore user error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};