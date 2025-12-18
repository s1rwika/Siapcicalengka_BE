const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import Controllers
const adminController = require('../controllers/adminController'); // Approval Dokter
const adminFeaturesController = require('../controllers/adminFeaturesController'); // Laporan & Pasien
const kegiatanController = require('../controllers/kegiatanController'); // Create Kegiatan

// Middleware & Upload
const verifyToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware: Hanya Admin/Superadmin
const isAdmin = [verifyToken, checkRole(['admin', 'superadmin'])];

// --- 1. MANAJEMEN DOKTER (Approval) ---
router.get('/pending-doctors', isAdmin, adminController.getPendingDoctors);
router.post('/approve-doctor/:approvalId', isAdmin, adminController.handleDoctorApproval);

// --- 2. MANAJEMEN KEGIATAN ---
// Admin membuat kegiatan baru
router.post('/kegiatan', isAdmin, kegiatanController.createKegiatan);
// Admin menyetujui/edit kegiatan (jika ada flow approval kegiatan)
router.put('/kegiatan/approve/:id', isAdmin, kegiatanController.approveKegiatan);

// --- 3. LAPORAN KEGIATAN (Dengan Gambar) ---
// Upload Laporan
router.post('/laporan', isAdmin, upload.single('img'), adminFeaturesController.createLaporan);
// Lihat Daftar Laporan (untuk dicetak)
router.get('/laporan', isAdmin, adminFeaturesController.getLaporan);
// Download Gambar Asli Laporan
router.get('/laporan/:id/download', isAdmin, adminFeaturesController.downloadLaporanImage);

// --- 4. RIWAYAT PASIEN (Navigasi) ---
router.get('/pasien/riwayat', isAdmin, adminFeaturesController.getAllRiwayatPasien);

module.exports = router;