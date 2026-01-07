const express = require('express');
const router = express.Router();
const multer = require('multer');

// Controllers
const adminController = require('../controllers/adminController');
const adminFeatureController = require('../controllers/adminFeaturesController');
const kegiatanController = require('../controllers/kegiatanController');

// Middleware
const { verifyToken } = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Admin & Superadmin only
const isAdmin = [
  verifyToken,
  checkRole(['admin', 'superadmin'])
];

// --- DOKTER ---
router.get(
  '/pending-doctors',
  isAdmin,
  adminController.getPendingDoctors
);

router.post(
  '/approve-doctor/:approvalId',
  isAdmin,
  adminController.handleDoctorApproval
);

// --- KEGIATAN ---
router.post(
  '/kegiatan',
  isAdmin,
  kegiatanController.createKegiatan
);

router.put(
  '/kegiatan/approve/:id',
  isAdmin,
  kegiatanController.approveKegiatan
);

// --- LAPORAN ---
router.post(
  '/laporan',
  isAdmin,
  upload.single('img'),
  adminFeatureController.createLaporan
);

router.get(
  '/laporan',
  isAdmin,
  adminFeatureController.getLaporan
);

router.get(
  '/laporan/:id/download',
  isAdmin,
  adminFeatureController.downloadLaporanImage
);

// --- RIWAYAT PASIEN ---
router.get(
  '/pasien/riwayat',
  isAdmin,
  adminFeatureController.getAllRiwayatPasien
);

module.exports = router;
