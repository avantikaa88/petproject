const jwt = require('jsonwebtoken');

// Middleware to protect routes -- checks that a valid JWT was sent
const protect = (req, res, next) => {
    try {
        let token;

        // Token is expected in the header as: Authorization: Bearer <token>
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, email, role }
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, invalid or expired token'
        });
    }
};

// Middleware to restrict a route to admins only.
// Use AFTER `protect`, e.g. router.delete('/:id', protect, isAdmin, deleteProduct)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admins only.'
    });
};

module.exports = { protect, isAdmin };