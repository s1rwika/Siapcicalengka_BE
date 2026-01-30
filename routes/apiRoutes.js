const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()

// ================= MIDDLEWARE =================
const { verifyToken, authorize } = require('../middleware/auth')

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
const petaController = require('../controllers/petaController')
const izinController = require('../controllers/izinController')

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
router.get('/peta/kegiatan/:lokasiId/akan-datang', petaController.getKegiatanAkanDatang)
router.get('/peta/kegiatan/:lokasiId/selesai', petaController.getKegiatanSelesai)

// REVIEWS (PUBLIC ACCESS)
router.get('/laporan/:laporanId/reviews', publicController.getReviewsByLaporanPublic)

// TEST/DEBUG ENDPOINTS
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
  adminController.addLokasi
)

// UPDATE LOKASI
router.put(
  '/admin/lokasi/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.updateLokasi
)

// DELETE LOKASI
router.delete(
  '/admin/lokasi/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.deleteLokasi
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

// ALTERNATIVE ROUTES FOR RIWAYAT PASIEN
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
// GET REVIEWS FOR LAPORAN (AUTHENTICATED)
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
// 12. ADMIN ROUTES - MANAJEMEN POLI
// =========================================================================
// ADMIN POLI
router.post(
  '/admin/poli',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.addPoli
)

router.put(
  '/admin/poli/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.updatePoli
)

router.delete(
  '/admin/poli/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.deletePoli
)

router.get('/jenis-kegiatan', adminController.getJenisKegiatan)

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

// =========================================================================
// 14. SUPERADMIN ROUTES - MANAJEMEN USER
// =========================================================================
// PERHATIAN: Semua route di bawah ini menggunakan PREFIX '/superadmin/', BUKAN '/api/superadmin/'

// 1. MANAJEMEN USERS (untuk halaman KelolaKaryawanPage)
router.get('/superadmin/users', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.getAllUsers
)

router.post('/superadmin/users', 
  verifyToken,
  authorize(['superadmin']),
  upload.single('img'),
  superadminController.createUser
)

router.put('/superadmin/users/:id', 
  verifyToken,
  authorize(['superadmin']),
  upload.single('img'),
  superadminController.updateUser
)

router.delete('/superadmin/users/:id', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.deleteUser
)

router.post('/superadmin/users/:id/reset-password', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.resetPassword
)

// 2. APPROVAL SYSTEM (untuk halaman Approval)
router.get('/superadmin/role-approvals', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.getRoleApprovals
)

router.put('/superadmin/approve-role/:id', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveRole
)

// 3. KEGIATAN APPROVAL
router.get('/superadmin/kegiatan', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.getApprovalKegiatan
)

router.put('/superadmin/kegiatan/:id/approve', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveKegiatan
)

router.put('/superadmin/kegiatan/:id/:status', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.updateStatusKegiatan
)

// 4. LAPORAN APPROVAL
router.put('/superadmin/laporan/:id/approve', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveLaporan
)

router.put('/superadmin/laporan/:id/reject', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.rejectLaporan
)

// 5. IZIN APPROVAL
router.get('/superadmin/izin', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.getAllIzin
)

router.put('/superadmin/izin/:id/approve', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveIzin
)

router.put('/superadmin/izin/:id/reject', 
  verifyToken,
  authorize(['superadmin']),
  superadminController.rejectIzin
)

// IZIN ROUTES dengan prefix /api
router.post('/izin', verifyToken, izinController.ajukanIzin); // TAMBAHKAN verifyToken
router.get('/izin/riwayat/:userId', verifyToken, izinController.getRiwayatIzin);
router.get('/izin/all', verifyToken, authorize(['superadmin']), izinController.getAllIzin);
router.get('/izin/approve/:id', verifyToken, authorize(['superadmin']), izinController.approveIzin);

module.exports = router