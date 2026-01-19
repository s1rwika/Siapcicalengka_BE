const db = require('../config/db');

// 1. Ambil Semua Lokasi (Untuk Dropdown di Frontend)
exports.getAllLokasi = async (req, res) => {
    try {
        // Sesuaikan nama kolom tabel lokasi di database Anda
        // Berdasarkan SQL yang Anda kirim, tabelnya 'lokasi', kolomnya biasanya 'id' dan 'nama_lokasi'
        const [rows] = await db.query('SELECT * FROM lokasi ORDER BY nama_lokasi ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Tambah Lokasi Baru (Opsional, jika Admin mau nambah tempat)
exports.addLokasi = async (req, res) => {
    const { nama_lokasi } = req.body;
    try {
        await db.query('INSERT INTO lokasi (nama_lokasi) VALUES (?)', [nama_lokasi]);
        res.status(201).json({ message: 'Lokasi berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};