const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, reviewController.createOrUpdateReview);
router.get('/kegiatan/:kegiatanId', reviewController.getReviewsByKegiatan);
router.get('/kegiatan/:kegiatanId/rating', reviewController.getRatingSummaryByKegiatan);
router.delete('/:reviewId', authMiddleware, reviewController.deleteReview);

module.exports = router;
