const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');

// Middleware tambahan: Pastikan yang akses adalah Admin/Superadmin
const verifyAdmin = (req, res, next) => {
    // Cek apakah req.user ada (dari verifyToken) dan role-nya sesuai
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({ message: 'Akses ditolak. Khusus Admin.' });
    }
    next();
};

// Route: GET semua request dokter (Butuh Login & Role Admin)
router.get('/approvals/doctors', verifyToken, verifyAdmin, adminController.getPendingDoctors);

// Route: PUT approve/reject (Butuh Login & Role Admin)
// Contoh body: { "action": "approve" }
router.put('/approvals/:approvalId', verifyToken, verifyAdmin, adminController.handleDoctorApproval);

module.exports = router;
