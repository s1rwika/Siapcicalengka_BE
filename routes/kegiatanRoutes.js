const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController');
const verifyToken = require('../middleware/authMiddleware');

// Semua route di bawah butuh login
router.get('/', verifyToken, kegiatanController.getAllKegiatan);
router.post('/', verifyToken, kegiatanController.createKegiatan);
router.put('/approval/:id', verifyToken, kegiatanController.approveKegiatan);

module.exports = router;
