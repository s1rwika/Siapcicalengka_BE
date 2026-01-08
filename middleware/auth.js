const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Akses ditolak, token tidak tersedia' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token tidak valid' });
        req.user = user; // Menyimpan data user (id, role) ke request
        next();
    });
};

// Middleware untuk membatasi akses berdasarkan Role
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Anda tidak memiliki izin untuk akses ini' });
        }
        next();
    };
};

module.exports = { verifyToken, authorize };