// controllers/adminFeaturesController.js
const db = require('../config/db');

// --- LAPORAN KEGIATAN ---

// Tambah Laporan dengan Detail & Gambar
exports.createLaporan = async (req, res) => {
    const { kegiatan_id, nama_file, judul_laporan, detail_kegiatan } = req.body;
    const imgBuffer = req.file ? req.file.buffer : null;

    try {
        if (!imgBuffer) return res.status(400).json({ message: "Gambar laporan wajib diupload" });

        await db.query(
            `INSERT INTO laporan (kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img) 
             VALUES (?, ?, ?, ?, ?)`,
            [kegiatan_id, nama_file, judul_laporan, detail_kegiatan, imgBuffer]
        );

        res.status(201).json({ message: 'Laporan berhasil dibuat' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Ambil Laporan (Untuk fitur Cetak/View)
exports.getLaporan = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT l.*, k.judul as nama_kegiatan, k.tanggal, k.lokasi 
            FROM laporan l
            JOIN kegiatan k ON l.kegiatan_id = k.id
        `);

        const laporan = rows.map(lap => ({
            ...lap,
            img: lap.img ? `data:image/jpeg;base64,${lap.img.toString('base64')}` : null
        }));

        res.json(laporan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- RIWAYAT PASIEN (Navigasi Admin) ---

exports.getAllRiwayatPasien = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rp.*, u.full_name as nama_dokter 
            FROM riwayat_pasien rp
            LEFT JOIN users u ON rp.dokter_id = u.id
            ORDER BY rp.tanggal DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Download gambar laporan
exports.downloadLaporanImage = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT img, nama_file FROM laporan WHERE id = ?',
            [id]
        );

        if (rows.length === 0 || !rows[0].img) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan' });
        }

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${rows[0].nama_file || 'laporan.jpg'}"`
        );
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(rows[0].img);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};