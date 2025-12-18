const db = require('../config/db');

// Tambah Komentar (Hanya Teks)
exports.addComment = async (req, res) => {
    const user_id = req.user.id;
    const { kegiatan_id, pesan } = req.body; // Hapus 'rating'

    try {
        // 1. Cek apakah kegiatan ada
        const [kegiatan] = await db.query('SELECT id FROM kegiatan WHERE id = ?', [kegiatan_id]);
        if (kegiatan.length === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });

        // 2. Cek apakah user sudah pernah komen di kegiatan ini? 
        // (Opsional: Jika user boleh komen berkali-kali, hapus blok validasi ini)
        /* const [existing] = await db.query(
            'SELECT id FROM kegiatan_review WHERE kegiatan_id = ? AND user_id = ?', 
            [kegiatan_id, user_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Anda sudah mengomentari kegiatan ini' });
        }
        */

        // 3. Insert Komentar (Tanpa Rating)
        await db.query(
            `INSERT INTO kegiatan_review (kegiatan_id, user_id, pesan, tanggal) 
             VALUES (?, ?, ?, NOW())`,
            [kegiatan_id, user_id, pesan]
        );

        res.status(201).json({ message: 'Komentar berhasil dikirim' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Ambil Daftar Komentar
exports.getCommentsByKegiatan = async (req, res) => {
    const { kegiatanId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT r.id, r.pesan, r.tanggal, u.full_name, u.img 
            FROM kegiatan_review r
            JOIN users u ON r.user_id = u.id
            WHERE r.kegiatan_id = ?
            ORDER BY r.tanggal DESC
        `, [kegiatanId]);

        // Convert BLOB image user jika ada
        const comments = rows.map(com => ({
            id: com.id,
            pesan: com.pesan,
            tanggal: com.tanggal,
            user: {
                full_name: com.full_name,
                img: com.img ? `data:image/jpeg;base64,${com.img.toString('base64')}` : null
            }
        }));

        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};