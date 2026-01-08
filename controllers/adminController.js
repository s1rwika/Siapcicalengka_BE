const db = require('../config/db');

// --- MANAJEMEN KEGIATAN ---
exports.createKegiatan = async (req, res) => {
    const { judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, jam_mulai, jam_selesai } = req.body;
    
    // Generate ID Kegiatan Unik (contoh: KG-timestamp)
    const idKegiatan = `KG-${Date.now()}`; 

    try {
        await db.query(
            'INSERT INTO kegiatan (id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [idKegiatan, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, req.user.id, jam_mulai, jam_selesai, 'menunggu']
        );
        res.status(201).json({ message: 'Kegiatan berhasil dibuat, menunggu approval', kegiatanId: idKegiatan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateKegiatan = async (req, res) => {
    const { id } = req.params;
    const { judul, deskripsi, tanggal, lokasi } = req.body;
    try {
        await db.query(
            'UPDATE kegiatan SET judul=?, deskripsi=?, tanggal=?, lokasi=? WHERE id=?',
            [judul, deskripsi, tanggal, lokasi, id]
        );
        res.json({ message: 'Kegiatan berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- LAPORAN KEGIATAN ---
exports.createLaporan = async (req, res) => {
    const { kegiatan_id, nama_file, judul_laporan, detail_kegiatan } = req.body;
    // img bisa ditangani middleware upload seperti Multer, di sini kita simpan placeholder/path
    const imgPlaceholder = req.file ? req.file.buffer : null; // Jika menggunakan multer memory storage

    try {
        await db.query(
            'INSERT INTO laporan (kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img) VALUES (?, ?, ?, ?, ?)',
            [kegiatan_id, nama_file, judul_laporan, detail_kegiatan, imgPlaceholder || '']
        );
        res.status(201).json({ message: 'Detail laporan berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCetakLaporanData = async (req, res) => {
    const { kegiatan_id } = req.params;
    try {
        // Mengambil data gabungan untuk dicetak
        const [data] = await db.query(`
            SELECT k.judul, k.tanggal, k.lokasi, l.judul_laporan, l.detail_kegiatan, l.nama_file
            FROM kegiatan k
            JOIN laporan l ON k.id = l.kegiatan_id
            WHERE k.id = ?
        `, [kegiatan_id]);

        if (data.length === 0) return res.status(404).json({ message: 'Data laporan tidak ditemukan' });

        res.json(data[0]); // Frontend akan menggunakan data ini untuk window.print() atau generate PDF
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- RIWAYAT PASIEN ---
exports.getRiwayatPasien = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rp.*, u.full_name as nama_dokter 
            FROM riwayat_pasien rp
            LEFT JOIN users u ON rp.dokter_id = u.id
            ORDER BY rp.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addRiwayatPasien = async (req, res) => {
    const { pasien_nama, dokter_id, diagnosis, tindakan, tanggal } = req.body;
    try {
        await db.query(
            'INSERT INTO riwayat_pasien (pasien_nama, dokter_id, diagnosis, tindakan, tanggal) VALUES (?, ?, ?, ?, ?)',
            [pasien_nama, dokter_id, diagnosis, tindakan, tanggal]
        );
        res.status(201).json({ message: 'Riwayat pasien berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};