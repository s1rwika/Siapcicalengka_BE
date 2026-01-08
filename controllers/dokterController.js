const db = require('../config/db');

exports.updateStatusKehadiran = async (req, res) => {
    const { status, keterangan, jam_masuk, jam_keluar } = req.body;
    const dokterId = req.user.id; // Diambil dari token

    // Validasi input status enum
    if (!['hadir', 'tidak_hadir'].includes(status)) {
        return res.status(400).json({ message: 'Status tidak valid (hadir/tidak_hadir)' });
    }

    try {
        // Insert status baru ke tabel dokter_status
        await db.query(
            'INSERT INTO dokter_status (dokter_id, status, keterangan, jam_masuk, jam_keluar) VALUES (?, ?, ?, ?, ?)',
            [dokterId, status, keterangan, jam_masuk, jam_keluar]
        );

        res.status(201).json({ message: 'Status kehadiran berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Opsional: Melihat riwayat kehadiran sendiri
exports.getMyStatusHistory = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dokter_status WHERE dokter_id = ? ORDER BY id DESC', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};