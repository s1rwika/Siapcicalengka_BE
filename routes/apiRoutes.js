const express = require('express');
const router = express.Router();

// --- IMPORT MIDDLEWARE ---
const { verifyToken, authorize } = require('../middleware/auth');

// --- IMPORT CONTROLLERS ---
const authController = require('../controllers/authController');
const publicController = require('../controllers/publicController');
const userController = require('../controllers/userController');
const dokterController = require('../controllers/dokterController');
const adminController = require('../controllers/adminController');
const superadminController = require('../controllers/superadminController');
const poliController = require('../controllers/poliController');
const jadwalController = require('../controllers/jadwalController')
const lokasiController = require('../controllers/lokasiController');


// =========================================================================
// 1. AUTHENTICATION (Semua User)
// =========================================================================
// Endpoint untuk daftar dan login
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// =========================================================================
// 2. PUBLIC / GUEST (Tanpa Login)
// =========================================================================
// Ketentuan: Bisa mengakses isi web, tidak ada fitur review
router.get('/kegiatan', publicController.getKegiatanPublic);
router.get('/kegiatan/:id/detail', publicController.getDetailKegiatanPublic);

// =========================================================================
// 3. USER (Login Required)
// =========================================================================
// Ketentuan: Bisa mengakses web + fitur review dan komentar
// Note: Role admin/superadmin juga diperbolehkan me-review (opsional)
router.post(
    '/kegiatan/:id/review', 
    verifyToken, 
    authorize(['user', 'admin', 'superadmin']), 
    userController.addReview
);

// =========================================================================
// 4. DOKTER
// =========================================================================
// Ketentuan: Bisa mengatur status hadir atau tidak
router.post(
    '/dokter/status', 
    verifyToken, 
    authorize(['dokter']), 
    dokterController.updateStatusKehadiran
);

// (Opsional) Melihat riwayat absensi sendiri
router.get(
    '/dokter/history', 
    verifyToken, 
    authorize(['dokter']), 
    dokterController.getMyStatusHistory
);

// =========================================================================
// 5. ADMIN
// =========================================================================
// Ketentuan: Mengatur kegiatan, Laporan, Cetak, Riwayat Pasien

// --- Manajemen Kegiatan ---
router.post(
    '/admin/kegiatan', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.createKegiatan
);
router.get(
  '/admin/kegiatan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.getAllKegiatanAdmin
);

router.put(
    '/admin/kegiatan/:id', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.updateKegiatan
);

// GET Data Kegiatan untuk Admin (Semua Status)
router.get(
    '/admin/kegiatan', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.getAllKegiatanAdmin
);

// --- Laporan & Cetak ---
// Jika nanti menggunakan upload file gambar, tambahkan middleware upload.single('file') disini
router.post(
    '/admin/laporan', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.createLaporan
);

router.get(
    '/admin/laporan/cetak/:kegiatan_id', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.getCetakLaporanData
);

// --- Riwayat Pasien ---
// Melihat data riwayat pasien (Dokter juga boleh lihat)
router.get(
    '/admin/riwayat-pasien', 
    verifyToken, 
    authorize(['admin', 'superadmin', 'dokter']), 
    adminController.getRiwayatPasien
);

// Menambah data riwayat pasien
router.post(
    '/admin/riwayat-pasien', 
    verifyToken, 
    authorize(['admin', 'superadmin']), 
    adminController.addRiwayatPasien
);

// =========================================================================
// 6. SUPERADMIN
// =========================================================================
// Ketentuan: Approval role dan kegiatan

// --- Approval Kegiatan ---
router.put(
    '/superadmin/approve-kegiatan/:id', 
    verifyToken, 
    authorize(['superadmin']), 
    superadminController.approveKegiatan
);

// --- Approval Role ---
// Melihat daftar request role
router.get(
    '/superadmin/role-approvals', 
    verifyToken, 
    authorize(['superadmin']), 
    superadminController.getRoleApprovals
);

// Menyetujui/Menolak role
router.put(
    '/superadmin/approve-role/:id', 
    verifyToken, 
    authorize(['superadmin']), 
    superadminController.approveRole
);

router.get('/poli', poliController.getAllPoli)

// =========================================================================
// DATA MASTER: LOKASI
// =========================================================================

// 1. GET LOKASI
// GET semua lokasi
router.get('/lokasi', lokasiController.getAllLokasi);

// POST tambah lokasi
router.post('/lokasi', lokasiController.addLokasi);

// 2. TAMBAH LOKASI
// Akses: Admin DAN Superadmin
router.post(
    '/admin/lokasi', 
    verifyToken, 
    authorize(['admin', 'superadmin']), // <--- DUA ROLE INI DIIZINKAN
    lokasiController.addLokasi
);

router.get('/dokter/poli/:poliId', dokterController.getDokterByPoli)

router.get('/jadwal/poli/:poliId', jadwalController.getJadwalByPoli)

router.get('/peta/kegiatan/:lokasiId/akan-datang', adminController.getAkanDatangByLokasi);
router.get('/peta/kegiatan/:lokasiId/selesai', adminController.getSelesaiByLokasi);









// =========================================================================
// REVIEW / KOMENTAR LAPORAN
// =========================================================================

// GET reviews untuk laporan
router.get(
  '/laporan/:laporanId/reviews',
  verifyToken,
  adminController.getReviewsByLaporan
);

// POST review baru
router.post(
  '/laporan/:laporanId/review',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']), // Hanya user, admin, superadmin
  adminController.addReview
);

// UPDATE review
router.put(
  '/review/:reviewId',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  adminController.updateReview
);

// DELETE review
router.delete(
  '/review/:reviewId',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  adminController.deleteReview
);



module.exports = router;

