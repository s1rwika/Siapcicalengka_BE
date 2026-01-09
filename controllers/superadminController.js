const db = require('../config/db');

/**
 * 1. MELIHAT DAFTAR PERMINTAAN ROLE (Pending)
 * Digunakan di halaman: ApprovalDokterPage (Frontend)
 * Route: GET /api/superadmin/role-approvals
 */
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

/**
 * 2. MENYETUJUI / MENOLAK PERMINTAAN ROLE
 * Digunakan saat tombol "Terima" atau "Tolak" diklik
 * Route: PUT /api/superadmin/approve-role/:id
 */
exports.approveRole = async (req, res) => {
    const { id } = req.params; // ID dari tabel role_approval
    const { status, alasan } = req.body; // status: 'disetujui' atau 'ditolak'

    try {
        // A. Ambil data request role dari database
        const [request] = await db.query('SELECT * FROM role_approval WHERE id = ?', [id]);
        
        if (request.length === 0) {
            return res.status(404).json({ message: 'Data request tidak ditemukan' });
        }

        const roleRequest = request[0];

        // B. Tentukan Role Baru
        // Jika kolom role_baru di DB kosong/null, defaultnya kita set jadi 'dokter'
        const targetRole = roleRequest.role_baru || 'dokter';

        // C. Logika Update
        if (status === 'disetujui') {
            // Update role di tabel USERS
            await db.query('UPDATE users SET role = ? WHERE id = ?', [targetRole, roleRequest.user_id]);
        }

        // D. Update status di tabel ROLE_APPROVAL (biar hilang dari list pending)
        await db.query(
            'UPDATE role_approval SET status = ?, alasan = ? WHERE id = ?', 
            [status, alasan, id]
        );

        res.json({ 
            message: `Sukses! Permintaan telah ${status}. ${status === 'disetujui' ? 'User sekarang adalah ' + targetRole : ''}` 
        });

    } catch (error) {
        console.error("Error approveRole:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * 3. APPROVAL KEGIATAN
 * Digunakan untuk menyetujui kegiatan yang dibuat Admin agar tampil di Publik
 * Route: PUT /api/superadmin/approve-kegiatan/:id
 */
exports.approveKegiatan = async (req, res) => {
    const { id } = req.params; // ID Kegiatan
    const { status, catatan } = req.body; // status: 'disetujui' atau 'ditolak'
    const superadminId = req.user.id; // ID Superadmin yang sedang login

    try {
        // Update status di tabel kegiatan
        const [updateResult] = await db.query('UPDATE kegiatan SET status = ? WHERE id = ?', [status, id]);
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
        }

        // Catat log approval
        // Kita bungkus try-catch kecil agar jika log gagal, response utama tetap sukses
        try {
            await db.query(
                'INSERT INTO kegiatan_approval (kegiatan_id, user_id, status, catatan) VALUES (?, ?, ?, ?)',
                [id, superadminId, status, catatan]
            );
        } catch (logError) {
            console.log("Gagal mencatat log approval:", logError.message);
        }

        res.json({ message: `Kegiatan berhasil diubah statusnya menjadi ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Endpoint khusus Admin: Melihat SEMUA data tanpa filter status
exports.getAllKegiatanAdmin = async (req, res) => {
    try {
        // Gunakan LEFT JOIN agar jika jenis_kegiatan terhapus, data kegiatan tetap muncul
        const [rows] = await db.query(`
            SELECT k.*, jk.jenis_kegiatan 
            FROM kegiatan k 
            LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            ORDER BY k.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};