const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'Token diperlukan untuk akses ini' });
    }

    try {
        // Biasanya format token: "Bearer <token_asli>"
        const bearer = token.split(' ');
        const bearerToken = bearer[1];
        
        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
        req.user = decoded; // Menyimpan data user ke request
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token tidak valid' });
    }
};

module.exports = verifyToken;
