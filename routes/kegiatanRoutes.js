// routes/kegiatanRoutes.js
const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');

// Import middleware auth Anda
const authMiddleware = require('../middleware/authMiddleware');
// Asumsi di authMiddleware ada fungsi untuk cek role, misal: verifyRole('role_name')

// --- Route Standar ---
router.get('/', kegiatanController.getAllKegiatan); // Semua bisa lihat
router.post('/', authMiddleware.verifyRole('Admin'), kegiatanController.createKegiatan); // Admin buat

// --- Route KHUSUS SUPERADMIN ---
// Menambahkan approval pada kegiatan yang sudah ada
router.patch('/:id/approve',
    authMiddleware.authenticate,      // Pastikan sudah login
    authMiddleware.verifyRole('Superadmin'), // Cek apakah dia Superadmin
    kegiatanController.approveKegiatan // Panggil fungsi controller tadi
);

module.exports = router;