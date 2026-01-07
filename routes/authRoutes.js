const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Setup Multer (BLOB / foto)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Register & Login
router.post('/register', upload.single('img'), authController.register);
router.post('/login', authController.login);

// Update foto profil (HARUS login)
router.put(
  '/update-photo',
  verifyToken,
  upload.single('img'),
  authController.updateProfilePhoto
);

module.exports = router;
