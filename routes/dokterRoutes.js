const express = require('express');
const router = express.Router();
const dokterController = require('../controllers/dokterController');
const verifyToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Middleware: Hanya Dokter yang boleh akses
const isDokter = [verifyToken, checkRole(['dokter'])];

// Update Status Kehadiran (Hadir/Tidak)
router.post('/status', isDokter, dokterController.updateStatus);

// Lihat Riwayat Absensi Saya
router.get('/history', isDokter, dokterController.getMyStatusHistory);

module.exports = router;