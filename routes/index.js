const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const kegiatanController = require('../controllers/kegiatanController');
const verifyToken = require('../middleware/authMiddleware');

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Kegiatan Routes (Protected)
router.get('/kegiatan', verifyToken, kegiatanController.getAllKegiatan);
router.post('/kegiatan', verifyToken, kegiatanController.createKegiatan);

module.exports = router;
