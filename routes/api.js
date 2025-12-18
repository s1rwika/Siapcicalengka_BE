const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // Untuk handle upload file/gambar

// Import Controllers
const authController = require('../controllers/authController');
const kegiatanController = require('../controllers/kegiatanController');
const dokterController = require('../controllers/dokterController');
const reviewController = require('../controllers/reviewController');
const adminfeatureController = require('../controllers/adminFeaturesController');
const adminController = require('../controllers/adminController'); // Yg upload user tadi

// Import Middleware
const verifyToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// --- PUBLIC ROUTES (Bisa diakses Guest tanpa login, kecuali fitur review) ---
router.post('/register', upload.single('img'), authController.register);
router.post('/login', authController.login);
router.get('/kegiatan', kegiatanController.getAllKegiatan); // Semua bisa lihat isi web (kegiatan)
router.get('/kegiatan/:kegiatanId/reviews', reviewController.getReviewsByKegiatan); // Lihat review

// --- PROTECTED ROUTES (Harus Login) ---

// 1. FITUR KOMENTAR USER
// Ketentuan: "Hanya user" (Admin & Dokter tidak bisa komen, hanya user biasa/warga)
// Ketentuan: "Tanpa review" (Hanya teks)
router.post('/kegiatan/comment',
    verifyToken,
    checkRole(['user']), // <--- STRICT: Hanya role 'user' yang boleh akses
    reviewController.addComment
);

// 2. FITUR DOKTER (Role: dokter)
// Ketentuan: Bisa mengatur status hadir
router.post('/dokter/status',
    verifyToken,
    checkRole(['dokter']),
    dokterController.updateStatus
);
router.get('/dokter/history',
    verifyToken,
    checkRole(['dokter']),
    dokterController.getMyStatusHistory
);

// 3. FITUR ADMIN (Role: admin & superadmin)
// Ketentuan: Mengatur kegiatan, Laporan (detail), Cetak Laporan, Navigasi Riwayat Pasien

// A. Mengatur Kegiatan (Approval / Edit / Delete)
router.post('/kegiatan', verifyToken, checkRole(['admin', 'superadmin']), kegiatanController.createKegiatan);
router.put('/kegiatan/approve/:id', verifyToken, checkRole(['admin', 'superadmin']), kegiatanController.approveKegiatan);

// B. Laporan (Memasukan detail kegiatan & gambar)
router.post('/laporan',
    verifyToken,
    checkRole(['admin', 'superadmin']),
    upload.single('img'),
    adminFeaturesController.createLaporan
);

// C. Cetak/Lihat Laporan
router.get('/laporan',
    verifyToken,
    checkRole(['admin', 'superadmin']),
    adminFeaturesController.getLaporan
);

// D. Navigasi Riwayat Pasien
router.get('/pasien/riwayat',
    verifyToken,
    checkRole(['admin', 'superadmin']),
    adminFeaturesController.getAllRiwayatPasien
);

// E. Approval Dokter Baru (Dari file user sebelumnya)
router.get('/admin/pending-doctors', verifyToken, checkRole(['admin', 'superadmin']), adminController.getPendingDoctors);
router.post('/admin/approve-doctor/:approvalId', verifyToken, checkRole(['admin', 'superadmin']), adminController.handleDoctorApproval);

// Untuk melihat komentar, biasanya publik (semua bisa lihat)
router.get('/kegiatan/:kegiatanId/comments', reviewController.getCommentsByKegiatan);

// --- PROFILE UPDATE (Semua User Login) ---
router.put('/profile/photo', verifyToken, upload.single('img'), authController.updateProfilePhoto);

module.exports = router;