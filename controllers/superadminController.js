const db = require('../config/db');

// --- APPROVAL ROLE ---
exports.getRoleApprovals = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ra.*, u.username, u.full_name 
            FROM role_approval ra
            JOIN users u ON ra.user_id = u.id
            WHERE ra.status = 'menunggu'
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.approveRole = async (req, res) => {
    const { id } = req.params; // ID dari tabel role_approval
    const { status, alasan } = req.body; // status: 'disetujui' atau 'ditolak'

    try {
        // Ambil data request role
        const [request] = await db.query('SELECT * FROM role_approval WHERE id = ?', [id]);
        if (request.length === 0) return res.status(404).json({ message: 'Request tidak ditemukan' });

        const roleRequest = request[0];

        if (status === 'disetujui') {
            // Update role user di tabel users
            await db.query('UPDATE users SET role = ? WHERE id = ?', [roleRequest.role, roleRequest.user_id]);
        }

        // Update status di tabel role_approval
        await db.query('UPDATE role_approval SET status = ?, alasan = ? WHERE id = ?', [status, alasan, id]);

        res.json({ message: `Role request ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- APPROVAL KEGIATAN ---
exports.approveKegiatan = async (req, res) => {
    const { id } = req.params; // ID Kegiatan
    const { status, catatan } = req.body; // status: 'disetujui' atau 'ditolak'
    const superadminId = req.user.id;

    try {
        // Update tabel kegiatan
        const [updateResult] = await db.query('UPDATE kegiatan SET status = ? WHERE id = ?', [status, id]);
        
        if (updateResult.affectedRows === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });

        // Catat log approval
        await db.query(
            'INSERT INTO kegiatan_approval (kegiatan_id, user_id, status, catatan) VALUES (?, ?, ?, ?)',
            [id, superadminId, status, catatan]
        );

        res.json({ message: `Kegiatan berhasil ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};