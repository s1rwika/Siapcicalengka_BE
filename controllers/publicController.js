const db = require('../config/db');

exports.getKegiatanPublic = async (req, res) => {
    try {
        // Guest hanya melihat kegiatan yang sudah disetujui
        const [rows] = await db.query(`
            SELECT k.id, k.judul, k.deskripsi, k.tanggal, k.lokasi, k.jam_mulai, k.jam_selesai, 
                   jk.jenis_kegiatan 
            FROM kegiatan k 
            JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            WHERE k.status = 'disetujui'
            ORDER BY k.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDetailKegiatanPublic = async (req, res) => {
    try {
        const { id } = req.params;
        const [kegiatan] = await db.query(`
            SELECT k.*, jk.jenis_kegiatan 
            FROM kegiatan k 
            JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            WHERE k.id = ?
        `, [id]);

        if (kegiatan.length === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });

        // Ambil review (Guest bisa lihat review tapi tidak bisa posting)
        const [reviews] = await db.query(`
            SELECT kr.id, kr.pesan, kr.rating, kr.tanggal, u.full_name 
            FROM kegiatan_review kr 
            JOIN users u ON kr.user_id = u.id 
            WHERE kr.kegiatan_id = ?
        `, [id]);

        res.json({ kegiatan: kegiatan[0], reviews });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};