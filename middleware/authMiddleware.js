const jwt = require('jsonwebtoken');

// ===============================
// VERIFY TOKEN (AUTH)
// ===============================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Tidak ada header Authorization
  if (!authHeader) {
    return res.status(401).json({
      message: 'Authorization token tidak ditemukan'
    });
  }

  // Format harus: Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      message: 'Format token tidak valid'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // payload JWT
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token tidak valid atau kadaluarsa'
    });
  }
};

// ===============================
// VERIFY ROLE
// ===============================
const verifyRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'User belum terautentikasi'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: 'Akses ditolak'
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  verifyRole
};
