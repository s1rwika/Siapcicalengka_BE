const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) return res.status(403).json({ message: "No token provided" });

    // Format biasanya "Bearer <token>"
    const bearer = token.split(' ');
    const bearerToken = bearer[1];

    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ message: "Failed to authenticate token" });
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

module.exports = verifyToken;
