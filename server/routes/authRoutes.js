const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const registerValidation = [
    body('full_name')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),

    body('phone_number')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('any').withMessage('Please provide a valid phone number'),

    body('address')
        .trim()
        .notEmpty().withMessage('Address is required')
        .isLength({ min: 5, max: 255 }).withMessage('Address must be 5-255 characters'),

    body('gender')
        .optional({ checkFalsy: true })
        .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender selection'),

    body('date_of_birth')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Invalid date format')
        .toDate()
];

const loginValidation = [
    body('email').trim().notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/profile', protect, authController.getProfile);

module.exports = router;