const db = require('../config/db');

/* =====================================================
   ===================== REVIEW ========================
   ===================================================== */

// ADD REVIEW FOR KEGIATAN
exports.addReview = async (req, res) => {
    const { id } = req.params; // ID Kegiatan
    const { pesan, rating } = req.body;
    const userId = req.user.id;

    try {
        // Validasi input
        if (!pesan || pesan.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Pesan review tidak boleh kosong' 
            });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ 
                success: false,
                message: 'Rating harus antara 1-5' 
            });
        }

        // Cek apakah kegiatan ada dan statusnya disetujui
        const [cekKegiatan] = await db.query(
            'SELECT id, status FROM kegiatan WHERE id = ?', 
            [id]
        );
        
        if (cekKegiatan.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Kegiatan tidak ditemukan' 
            });
        }

        const kegiatan = cekKegiatan[0];
        
        // Opsional: Cek status kegiatan
        if (kegiatan.status !== 'disetujui') {
            return res.status(400).json({ 
                success: false,
                message: 'Review hanya bisa ditambahkan untuk kegiatan yang sudah disetujui' 
            });
        }

        // Cek apakah user sudah memberikan review untuk kegiatan ini
        const [existingReview] = await db.query(
            'SELECT id FROM kegiatan_review WHERE kegiatan_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existingReview.length > 0) {
            return res.status(409).json({ 
                success: false,
                message: 'Anda sudah memberikan review untuk kegiatan ini' 
            });
        }

        // Insert review
        const [result] = await db.query(
            'INSERT INTO kegiatan_review (kegiatan_id, user_id, pesan, rating) VALUES (?, ?, ?, ?)',
            [id, userId, pesan.trim(), rating || null]
        );

        res.status(201).json({ 
            success: true,
            message: 'Review berhasil ditambahkan',
            review_id: result.insertId
        });
    } catch (error) {
        console.error('Error in addReview:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false,
                message: 'Anda sudah memberikan review untuk kegiatan ini' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Gagal menambahkan review',
            error: error.message 
        });
    }
};

// GET REVIEWS FOR KEGIATAN
exports.getReviewsForKegiatan = async (req, res) => {
    const { id } = req.params; // ID Kegiatan

    try {
        // ... kode sebelumnya ...

        // Get reviews with user information
        const [reviews] = await db.query(`
            SELECT 
                kr.id,
                kr.pesan,
                kr.rating,
                kr.created_at,
                u.full_name as reviewer_name
                -- Hapus: u.email as reviewer_email
            FROM kegiatan_review kr
            JOIN users u ON kr.user_id = u.id
            WHERE kr.kegiatan_id = ?
            ORDER BY kr.created_at DESC
        `, [id]);

        // ... kode setelahnya ...
    } catch (error) {
        // ... error handling ...
    }
};
// UPDATE REVIEW
exports.updateReview = async (req, res) => {
    const { reviewId } = req.params;
    const { pesan, rating } = req.body;
    const userId = req.user.id;

    try {
        // Validasi input
        if (!pesan || pesan.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Pesan review tidak boleh kosong' 
            });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ 
                success: false,
                message: 'Rating harus antara 1-5' 
            });
        }

        // Cek apakah review milik user
        const [review] = await db.query(
            'SELECT id, kegiatan_id FROM kegiatan_review WHERE id = ? AND user_id = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Review tidak ditemukan atau Anda tidak memiliki akses' 
            });
        }

        // Update review
        const [result] = await db.query(
            'UPDATE kegiatan_review SET pesan = ?, rating = ?, updated_at = NOW() WHERE id = ?',
            [pesan.trim(), rating || null, reviewId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Gagal memperbarui review' 
            });
        }

        res.json({ 
            success: true,
            message: 'Review berhasil diperbarui'
        });
    } catch (error) {
        console.error('Error in updateReview:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal memperbarui review',
            error: error.message 
        });
    }
};

// DELETE REVIEW
exports.deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id;

    try {
        // Cek apakah review milik user
        const [review] = await db.query(
            'SELECT id FROM kegiatan_review WHERE id = ? AND user_id = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Review tidak ditemukan atau Anda tidak memiliki akses' 
            });
        }

        // Delete review
        const [result] = await db.query(
            'DELETE FROM kegiatan_review WHERE id = ?',
            [reviewId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Gagal menghapus review' 
            });
        }

        res.json({ 
            success: true,
            message: 'Review berhasil dihapus'
        });
    } catch (error) {
        console.error('Error in deleteReview:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal menghapus review',
            error: error.message 
        });
    }
};

/* =====================================================
   ===================== USERS =========================
   ===================================================== */

// GET USERS BY ROLE (ADMIN)
exports.getUsersByRole = async (req, res) => {
    const { role } = req.query;

    try {
        let sql = `
            SELECT 
                id, 
                username,
                full_name AS name,
                role,
                created_at
                -- Hapus: updated_at
            FROM users 
            WHERE 1=1
        `;
        let params = [];

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }

        sql += ' ORDER BY full_name ASC';

        const [rows] = await db.query(sql, params);
        
        res.json({ 
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error in getUsersByRole:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal mengambil data user',
            error: error.message 
        });
    }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(`
            SELECT 
                id, 
                username,
                full_name AS name,
                role,
                created_at
                -- Hapus: updated_at
            FROM users 
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User tidak ditemukan' 
            });
        }

        res.json({ 
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal mengambil data user',
            error: error.message 
        });
    }
};

// UPDATE USER (ADMIN)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, role } = req.body;

    try {
        // Validasi input
        if (!full_name || full_name.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Nama lengkap tidak boleh kosong' 
            });
        }

        const validRoles = ['superadmin', 'admin', 'dokter', 'user'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false,
                message: 'Role tidak valid' 
            });
        }

        // Check if user exists
        const [userExists] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (userExists.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User tidak ditemukan' 
            });
        }

        // Update user (tanpa updated_at)
        const [result] = await db.query(
            'UPDATE users SET full_name = ?, role = ? WHERE id = ?', // Hapus updated_at
            [full_name.trim(), role, id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Tidak ada perubahan data' 
            });
        }

        res.json({ 
            success: true,
            message: 'User berhasil diperbarui'
        });
    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal memperbarui user',
            error: error.message 
        });
    }
};

// DELETE USER (ADMIN)
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if user exists
        const [userExists] = await db.query(
            'SELECT id, role FROM users WHERE id = ?',
            [id]
        );

        if (userExists.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User tidak ditemukan' 
            });
        }

        // Prevent deletion of admin users (optional)
        if (userExists[0].role === 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Tidak dapat menghapus user dengan role admin' 
            });
        }

        // Delete user
        const [result] = await db.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Gagal menghapus user' 
            });
        }

        res.json({ 
            success: true,
            message: 'User berhasil dihapus'
        });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ 
            success: false,
            message: 'Gagal menghapus user',
            error: error.message 
        });
    }
};