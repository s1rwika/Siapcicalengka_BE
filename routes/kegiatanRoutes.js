const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Route Umum ---
router.get('/', kegiatanController.getAllKegiatan); // Public

// --- Admin ---
router.post(
    '/',
    authMiddleware.verifyToken,
    authMiddleware.verifyRole('Admin'),
    kegiatanController.createKegiatan
);

// --- Superadmin ---
router.patch(
    '/:id/approve',
    authMiddleware.verifyToken,
    authMiddleware.verifyRole('Superadmin'),
    kegiatanController.approveKegiatan
);

module.exports = router;
