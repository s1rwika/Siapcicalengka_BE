const db = require('../config/db');

// Ambil semua kegiatan
exports.getAllKegiatan = async (req, res) => {
    try {
        const [kegiatan] = await db.query(`
            SELECT k.*, u.full_name as pembuat, jk.jenis_kegiatan 
            FROM kegiatan k
            JOIN users u ON k.user_id = u.id
            JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            ORDER BY k.tanggal DESC -- Urutkan dari yang terbaru
        `);
        res.json(kegiatan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Tambah kegiatan baru
exports.createKegiatan = async (req, res) => {
    // REVISI: Ambil 'id' dari req.body (Frontend), JANGAN generate sendiri pakai 'KG-'
    const { id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, jam_mulai, jam_selesai } = req.body;

    // Ambil User ID dari Token (middleware auth)
    const user_id = req.user.id;

    // Validasi sederhana: Pastikan ID ada
    if (!id) {
        return res.status(400).json({ message: 'ID Kegiatan wajib diisi' });
    }

    try {
        // Cek apakah ID sudah ada (untuk mencegah duplikat)
        const [existing] = await db.query('SELECT id FROM kegiatan WHERE id = ?', [id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `ID Kegiatan ${id} sudah ada. Silakan refresh halaman.` });
        }

        await db.query(
            `INSERT INTO kegiatan (id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')`,
            [id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai]
        );
        res.status(201).json({ message: 'Kegiatan berhasil diajukan', kegiatanId: id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Approval Kegiatan (Hanya untuk Admin/Superadmin)
exports.approveKegiatan = async (req, res) => {
    try {
        const { id } = req.params;

        // Logika update database (sesuaikan dengan ORM/Query Anda, misal Sequelize/Prisma/SQL)
        // Contoh logika: UPDATE kegiatan SET status = 'Approved' WHERE id = ...

        // Simulasi response sukses
        res.status(200).json({
            status: 'disetujui',
            message: `Kegiatan dengan ID ${id} berhasil disetujui (Approved).`
        });

    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan server', error });
    }
};
