const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()

// ================= MIDDLEWARE =================
const { verifyToken, authorize, verifyAdmin } = require('../middleware/auth') // Tambahkan verifyAdmin jika dibuat

// ================= CONTROLLERS =================
const authController = require('../controllers/authController')
const publicController = require('../controllers/publicController')
const userController = require('../controllers/userController')
const dokterController = require('../controllers/dokterController')
const adminController = require('../controllers/adminController')
const superadminController = require('../controllers/superadminController')
const poliController = require('../controllers/poliController')
const jadwalController = require('../controllers/jadwalController')
const lokasiController = require('../controllers/lokasiController')
const riwayatPenyakitController = require('../controllers/riwayatPenyakitController')
const absensiController = require('../controllers/absensiController')

// =========================================================================
// 1. AUTHENTICATION
// =========================================================================
router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)
router.get('/auth/profile', verifyToken, authController.getProfile)

// =========================================================================
// 2. PUBLIC / GUEST ROUTES
// =========================================================================
// KEGIATAN
router.get('/kegiatan', publicController.getKegiatanPublic)
router.get('/kegiatan/:id/detail', publicController.getDetailKegiatanPublic)

// DATA MASTER
router.get('/lokasi', lokasiController.getAllLokasi)
router.get('/poli', poliController.getAllPoli)
router.get('/dokter/poli/:poliId', dokterController.getDokterByPoli)
router.get('/jadwal/poli/:poliId', jadwalController.getJadwalByPoli)

// KEGIATAN BERDASARKAN LOKASI
router.get('/peta/kegiatan/:lokasiId/akan-datang', adminController.getAkanDatangByLokasi)
router.get('/peta/kegiatan/:lokasiId/selesai', adminController.getSelesaiByLokasi)

// REVIEWS (PUBLIC ACCESS) - TAMBAHAN BARU
router.get('/laporan/:laporanId/reviews', publicController.getReviewsByLaporanPublic)

// TEST/DEBUG ENDPOINTS (optional, bisa dihapus di production)
router.get('/test/reviews', publicController.testReviewConnection)
router.get('/debug/reviews-info', publicController.getReviewTableInfo)


// =========================================================================
// 3. USER ROUTES
// =========================================================================
// REVIEW KEGIATAN
router.post(
  '/kegiatan/:id/review',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  userController.addReview
)

// =========================================================================
// 4. DOKTER ROUTES
// =========================================================================
// JADWAL & STATUS
router.get(
  '/dokter/my-schedule',
  verifyToken,
  authorize(['dokter']),
  dokterController.getMySchedule
)

router.get(
  '/dokter/current-status',
  verifyToken,
  authorize(['dokter']),
  dokterController.getMyCurrentStatus
)

router.post(
  '/dokter/status',
  verifyToken,
  authorize(['dokter']),
  dokterController.updateStatusKehadiran
)

router.get(
  '/dokter/history',
  verifyToken,
  authorize(['dokter']),
  dokterController.getMyStatusHistory
)

// ABSENSI
router.post(
  "/absen",
  verifyToken,
  authorize(['dokter']),
  absensiController.absen
)

// =========================================================================
// 5. ADMIN ROUTES - MANAJEMEN KEGIATAN
// =========================================================================
// CREATE KEGIATAN
router.post(
  '/admin/kegiatan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.createKegiatan
)

// GET ALL KEGIATAN
router.get(
  '/admin/kegiatan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.getAllKegiatanAdmin
)

// UPDATE KEGIATAN
router.put(
  '/admin/kegiatan/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.updateKegiatan
)

// =========================================================================
// 6. ADMIN ROUTES - MANAJEMEN LAPORAN
// =========================================================================
// GET ALL LAPORAN
router.get(
  '/admin/laporan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.getAllLaporan
)

// CREATE LAPORAN
router.post(
  '/admin/laporan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  upload.single('img'),
  adminController.createLaporan
)

// UPDATE LAPORAN
router.put(
  '/admin/laporan/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  upload.single('img'),
  adminController.updateLaporan
)

// DELETE LAPORAN
router.delete(
  '/admin/laporan/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.deleteLaporan
)

// CETAK LAPORAN
router.get(
  '/admin/laporan/cetak/:kegiatan_id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.getCetakLaporanData
)

// =========================================================================
// 7. ADMIN ROUTES - MANAJEMEN DOKTER
// =========================================================================
// GET USER YANG BELUM JADI DOKTER
router.get(
  '/admin/user-dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getUserDokter
)

// GET ALL DOKTER
router.get(
  '/admin/dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getAllDokterAdmin
)

// ADD DOKTER
router.post(
  '/admin/dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.addDokterAdmin
)

// UPDATE DOKTER
router.put(
  '/admin/dokter/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.updateDokterAdmin
)

// GET JADWAL DOKTER
router.get(
  '/admin/dokter/:id/jadwal',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getJadwalDokterAdmin
)

// ADD JADWAL DOKTER
router.post(
  '/admin/jadwal',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.addJadwalDokterAdmin
)

// UPDATE JADWAL DOKTER
router.put(
  '/admin/jadwal/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.updateJadwalDokterAdmin
)

// =========================================================================
// 8. ADMIN ROUTES - MANAJEMEN LOKASI
// =========================================================================
// ADD LOKASI
router.post(
  '/admin/lokasi',
  verifyToken,
  authorize(['admin', 'superadmin']),
  lokasiController.addLokasi
)

// =========================================================================
// 9. ADMIN ROUTES - RIWAYAT PASIEN
// =========================================================================
// GET ALL RIWAYAT PASIEN
router.get(
  '/admin/riwayat-pasien',
  verifyToken,
  authorize(['admin', 'superadmin', 'dokter']),
  riwayatPenyakitController.getAll
)

// CREATE RIWAYAT PASIEN
router.post(
  '/admin/riwayat-pasien',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.create
)

// UPDATE RIWAYAT PASIEN
router.put(
  '/admin/riwayat-pasien/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.update
)

// DELETE RIWAYAT PASIEN
router.delete(
  '/admin/riwayat-pasien/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.remove
)

// ALTERNATIVE ROUTES FOR RIWAYAT PASIEN (jika masih menggunakan adminController)
router.get(
  '/admin/riwayat-pasien-old',
  verifyToken,
  authorize(['admin', 'superadmin', 'dokter']),
  adminController.getRiwayatPasien
)

router.post(
  '/admin/riwayat-pasien-old',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.addRiwayatPasien
)

// =========================================================================
// 10. REVIEW / KOMENTAR LAPORAN
// =========================================================================
// GET REVIEWS FOR LAPORAN (AUTHENTICATED - dengan info user review)
router.get(
  '/laporan/:laporanId/reviews/auth',
  verifyToken,
  adminController.getReviewsByLaporan
)

// ADD REVIEW FOR LAPORAN
router.post(
  '/laporan/:laporanId/review',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  adminController.addReview
)

// UPDATE REVIEW
router.put(
  '/review/:reviewId',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  adminController.updateReview
)

// DELETE REVIEW
router.delete(
  '/review/:reviewId',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  adminController.deleteReview
)

// =========================================================================
// 11. USER MANAGEMENT
// =========================================================================
// GET USERS BY ROLE
router.get(
  '/users',
  verifyToken,
  authorize(['admin', 'superadmin']),
  userController.getUsersByRole
)

// =========================================================================
// 12. SUPERADMIN ROUTES
// =========================================================================
// APPROVE KEGIATAN
router.put(
  '/superadmin/approve-kegiatan/:id',
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveKegiatan
)

// GET ROLE APPROVALS
router.get(
  '/superadmin/role-approvals',
  verifyToken,
  authorize(['superadmin']),
  superadminController.getRoleApprovals
)

// APPROVE ROLE
router.put(
  '/superadmin/approve-role/:id',
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveRole
)

// =========================================================================
// 13. STATISTIK PENYAKIT
// =========================================================================
// GET STATISTIK PENYAKIT
router.get(
  '/statistik-penyakit',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.getStatistikPenyakit
)

// GET DISTRIBUSI LOKASI
router.get(
  '/distribusi-lokasi',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.getDistribusiLokasi
)

// Di bagian PUBLIC ROUTES
router.get('/test/reviews', publicController.testReviewConnection);

module.exports = router