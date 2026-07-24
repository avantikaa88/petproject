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
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// DELETE /api/users/:id  (admin only)
exports.deleteUser = async (req, res) => {
    try {
        await User.delete(req.params.id);
        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};