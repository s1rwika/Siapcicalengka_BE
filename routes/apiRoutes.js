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

// =========================================================================
// 1. AUTH
// =========================================================================
router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)

// =========================================================================
// 2. PUBLIC
// =========================================================================
router.get('/kegiatan', publicController.getKegiatanPublic)
router.get('/kegiatan/:id/detail', publicController.getDetailKegiatanPublic)

// =========================================================================
// 3. USER
// =========================================================================
router.post(
  '/kegiatan/:id/review',
  verifyToken,
  authorize(['user', 'admin', 'superadmin']),
  userController.addReview
)

// =========================================================================
// 4. DOKTER
// =========================================================================
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

router.get('/dokter/poli/:poliId', dokterController.getDokterByPoli)

// =========================================================================
// 5. ADMIN – KEGIATAN
// =========================================================================
router.post(
  '/admin/kegiatan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.createKegiatan
)

router.get(
  '/admin/kegiatan',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.getAllKegiatanAdmin
)

router.put(
  '/admin/kegiatan/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  adminController.updateKegiatan
)

// =========================================================================
// 6. ADMIN – LAPORAN
// =========================================================================
router.get(
  '/admin/laporan',
  verifyToken,
  authorize(['admin','superadmin']),
  adminController.getAllLaporan
)

router.post(
  '/admin/laporan',
  verifyToken,
  authorize(['admin','superadmin']),
  upload.single('img'),
  adminController.createLaporan
)

// UPDATE LAPORAN
router.put(
  '/admin/laporan/:id',
  verifyToken,
  authorize(['admin','superadmin']),
  upload.single('img'),
  adminController.updateLaporan
)

router.delete(
  '/admin/laporan/:id',
  verifyToken,
  authorize(['admin','superadmin']),
  adminController.deleteLaporan
)

// =========================================================================
// 7. RIWAYAT PENYAKIT (INI FOKUS KAMU)
// =========================================================================
router.get(
  '/admin/riwayat-pasien',
  verifyToken,
  authorize(['admin', 'superadmin', 'dokter']),
  riwayatPenyakitController.getAll
)

router.post(
  '/admin/riwayat-pasien',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.create
)

router.put(
  '/admin/riwayat-pasien/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.update
)

router.delete(
  '/admin/riwayat-pasien/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  riwayatPenyakitController.remove
)


// =========================================================================
// 8. DATA MASTER
// =========================================================================
router.get('/lokasi', lokasiController.getAllLokasi)

router.post(
  '/admin/lokasi',
  verifyToken,
  authorize(['admin', 'superadmin']),
  lokasiController.addLokasi
)

router.get('/poli', poliController.getAllPoli)

// =========================================================================
// 9. ADMIN – DOKTER & JADWAL
// =========================================================================
router.get(
  '/admin/dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getAllDokterAdmin
)

router.post(
  '/admin/dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.addDokterAdmin
)

router.put(
  '/admin/dokter/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.updateDokterAdmin
)

router.get(
  '/admin/dokter/:id/jadwal',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getJadwalDokterAdmin
)

router.post(
  '/admin/jadwal',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.addJadwalDokterAdmin
)

router.put(
  '/admin/jadwal/:id',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.updateJadwalDokterAdmin
)

router.get(
  '/admin/user-dokter',
  verifyToken,
  authorize(['admin', 'superadmin']),
  dokterController.getUserDokter
)

// =========================================================================
// 10. SUPERADMIN
// =========================================================================
router.put(
  '/superadmin/approve-kegiatan/:id',
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveKegiatan
)

router.get(
  '/superadmin/role-approvals',
  verifyToken,
  authorize(['superadmin']),
  superadminController.getRoleApprovals
)

router.put(
  '/superadmin/approve-role/:id',
  verifyToken,
  authorize(['superadmin']),
  superadminController.approveRole
)

// =========================================================================
// USERS (FILTER ROLE)
// =========================================================================
router.get(
  '/users',
  verifyToken,
  authorize(['admin', 'superadmin']),
  userController.getUsersByRole
)

module.exports = router
