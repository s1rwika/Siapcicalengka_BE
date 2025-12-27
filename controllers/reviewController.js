const db = require('../config/db');

/**
 * =====================================================
 * TAMBAH / UPDATE KOMENTAR + RATING (1–5 BINTANG)
 * USER LOGIN SAJA
 * =====================================================
 */
exports.createOrUpdateReview = async (req, res) => {
    const user_id = req.user.id;
    const { kegiatan_id, pesan, rating } = req.body;

    // Validasi
    if (!kegiatan_id || !rating) {
        return res.status(400).json({
            message: 'kegiatan_id dan rating wajib diisi'
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            message: 'Rating harus antara 1 sampai 5'
        });
    }

    try {
        // 1. Cek kegiatan
        const [kegiatan] = await db.query(
            'SELECT id FROM kegiatan WHERE id = ?',
            [kegiatan_id]
        );

        if (kegiatan.length === 0) {
            return res.status(404).json({
                message: 'Kegiatan tidak ditemukan'
            });
        }

        // 2. Cek review user
        const [existing] = await db.query(
            'SELECT id FROM kegiatan_review WHERE kegiatan_id = ? AND user_id = ?',
            [kegiatan_id, user_id]
        );

        if (existing.length > 0) {
            // Update review
            await db.query(
                `UPDATE kegiatan_review
                 SET pesan = ?, rating = ?, tanggal = NOW()
                 WHERE kegiatan_id = ? AND user_id = ?`,
                [pesan, rating, kegiatan_id, user_id]
            );

            return res.json({
                message: 'Review berhasil diperbarui'
            });
        }

        // 3. Insert review
        await db.query(
            `INSERT INTO kegiatan_review
             (kegiatan_id, user_id, pesan, rating, tanggal)
             VALUES (?, ?, ?, ?, NOW())`,
            [kegiatan_id, user_id, pesan, rating]
        );

        res.status(201).json({
            message: 'Review berhasil ditambahkan'
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/**
 * =====================================================
 * AMBIL REVIEW BERDASARKAN KEGIATAN
 * =====================================================
 */
exports.getReviewsByKegiatan = async (req, res) => {
    const { kegiatanId } = req.params;

    try {
        const [rows] = await db.query(`
            SELECT 
                r.id,
                r.pesan,
                r.rating,
                r.tanggal,
                u.full_name,
                u.img
            FROM kegiatan_review r
            JOIN users u ON r.user_id = u.id
            WHERE r.kegiatan_id = ?
            ORDER BY r.tanggal DESC
        `, [kegiatanId]);

        const reviews = rows.map(item => ({
            id: item.id,
            pesan: item.pesan,
            rating: item.rating,
            tanggal: item.tanggal,
            user: {
                full_name: item.full_name,
                img: item.img
                    ? `data:image/jpeg;base64,${item.img.toString('base64')}`
                    : null
            }
        }));

        res.json(reviews);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/**
 * =====================================================
 * AMBIL RINGKASAN RATING KEGIATAN
 * =====================================================
 */
exports.getRatingSummaryByKegiatan = async (req, res) => {
    const { kegiatanId } = req.params;

    try {
        const [rows] = await db.query(`
            SELECT 
                ROUND(AVG(rating), 1) AS rata_rating,
                COUNT(rating) AS total_rating
            FROM kegiatan_review
            WHERE kegiatan_id = ?
        `, [kegiatanId]);

        res.json({
            rata_rating: rows[0].rata_rating || 0,
            total_rating: rows[0].total_rating
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/**
 * =====================================================
 * HAPUS REVIEW (HANYA PEMILIK)
 * =====================================================
 */
exports.deleteReview = async (req, res) => {
    const user_id = req.user.id;
    const { reviewId } = req.params;

    try {
        const [review] = await db.query(
            'SELECT id FROM kegiatan_review WHERE id = ? AND user_id = ?',
            [reviewId, user_id]
        );

        if (review.length === 0) {
            return res.status(403).json({
                message: 'Tidak diizinkan menghapus review ini'
            });
        }

        await db.query(
            'DELETE FROM kegiatan_review WHERE id = ?',
            [reviewId]
        );

        res.json({
            message: 'Review berhasil dihapus'
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
