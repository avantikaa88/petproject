const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate a JWT that stores the user's id, email and role
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { full_name, email, username, password, phone_number, address, gender, date_of_birth } = req.body;

        if (await User.emailExists(email)) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        if (await User.usernameExists(username)) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        const newUser = await User.create({ full_name, email, username, password, phone_number, address, gender, date_of_birth });
        const token = generateToken(newUser.user_id, newUser.email, newUser.role);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: newUser
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration', error: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body; // "email" field accepts email OR username

        const user = await User.findByEmailOrUsername(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await User.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Password is correct, but the account has been soft-deleted by an
        // admin -- checked *after* the password so we don't reveal a
        // deactivated account's existence to someone who doesn't know the
        // password.
        if (user.is_deleted) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support for help.'
            });
        }

        const token = generateToken(user.user_id, user.email, user.role);
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
    }
};

// GET /api/auth/profile  (requires token)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};