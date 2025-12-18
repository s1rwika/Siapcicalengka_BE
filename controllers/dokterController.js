// controllers/dokterController.js
const db = require('../config/db');

// Set Status Kehadiran (Hadir/Tidak Hadir)
exports.updateStatus = async (req, res) => {
    const dokter_id = req.user.id; // Dari token
    const { status, keterangan, jam_masuk, jam_keluar } = req.body;

    try {
        // Validasi input
        if (!['hadir', 'tidak_hadir'].includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid' });
        }

        // Insert log status baru
        await db.query(
            `INSERT INTO dokter_status (dokter_id, status, keterangan, jam_masuk, jam_keluar) 
             VALUES (?, ?, ?, ?, ?)`,
            [dokter_id, status, keterangan, jam_masuk, jam_keluar]
        );

        res.status(201).json({ message: 'Status kehadiran berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Melihat Riwayat Status Sendiri
exports.getMyStatusHistory = async (req, res) => {
    const dokter_id = req.user.id;
    try {
        const [rows] = await db.query(
            'SELECT * FROM dokter_status WHERE dokter_id = ? ORDER BY id DESC',
            [dokter_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};