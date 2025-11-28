const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

// Setup Multer (Simpan di memori sementara sebelum masuk database)
const multer = require('multer');
const storage = multer.memoryStorage(); // PENTING: Gunakan memoryStorage untuk BLOB
const upload = multer({ storage: storage });

// Tambahkan upload.single('img') -> 'img' adalah nama field di form frontend
router.post('/register', upload.single('img'), authController.register);
router.post('/login', authController.login);

// Route baru untuk ganti foto (Butuh Login/Token)
router.put('/update-photo', verifyToken, upload.single('img'), authController.updateProfilePhoto);

module.exports = router;
