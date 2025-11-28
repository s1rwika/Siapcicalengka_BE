const db = require('../config/db');

// 1. Ambil daftar dokter yang menunggu persetujuan
exports.getPendingDoctors = async (req, res) => {
    try {
        // Kita join tabel role_approval dengan users untuk dapat nama dokter
        const [rows] = await db.query(`
            SELECT ra.id, ra.user_id, ra.status, ra.tanggal, u.full_name, u.username, u.img 
            FROM role_approval ra
            JOIN users u ON ra.user_id = u.id
            WHERE ra.status = 'menunggu' AND ra.role = 'dokter'
        `);

        // Convert BLOB image ke Base64 untuk preview foto dokter
        const requests = rows.map(req => ({
            ...req,
            img: req.img ? `data:image/jpeg;base64,${req.img.toString('base64')}` : null
        }));

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Fungsi Approve / Reject
exports.handleDoctorApproval = async (req, res) => {
    const { approvalId } = req.params; // ID dari tabel role_approval
    const { action } = req.body; // 'approve' atau 'reject'

    try {
        // Ambil data request dulu
        const [rows] = await db.query('SELECT * FROM role_approval WHERE id = ?', [approvalId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Request tidak ditemukan' });

        const requestData = rows[0];

        if (action === 'approve') {
            // A. Update status di role_approval
            await db.query('UPDATE role_approval SET status = "disetujui" WHERE id = ?', [approvalId]);
            
            // B. Update role user di tabel users menjadi 'dokter'
            await db.query('UPDATE users SET role = "dokter" WHERE id = ?', [requestData.user_id]);

            res.json({ message: 'Dokter berhasil disetujui. Akun kini aktif.' });

        } else if (action === 'reject') {
            // C. Kalau ditolak, cuma update status approval aja
            await db.query('UPDATE role_approval SET status = "ditolak" WHERE id = ?', [approvalId]);
            res.json({ message: 'Permintaan dokter ditolak.' });
        
        } else {
            res.status(400).json({ message: 'Action tidak valid' });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
