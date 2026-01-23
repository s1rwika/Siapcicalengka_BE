const db = require('../config/db'); // Pastikan path ke koneksi database Anda benar

const izinController = {
    // 1. Fungsi untuk Dokter mengajukan izin
    ajukanIzin: async (req, res) => {
        const { user_id, jenis_izin, tanggal_awal, tanggal_akhir, alasan } = req.body;

        // Validasi input sederhana
        if (!user_id || !jenis_izin || !tanggal_awal || !tanggal_akhir || !alasan) {
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        try {
            const query = `
                INSERT INTO pengajuan_izin (user_id, jenis_izin, tanggal_awal, tanggal_akhir, alasan, status_approval) 
                VALUES (?, ?, ?, ?, ?, 'Pending')
            `;
            await db.query(query, [user_id, jenis_izin, tanggal_awal, tanggal_akhir, alasan]);

            res.status(201).json({ message: "Pengajuan izin berhasil dikirim ke Superadmin" });
        } catch (error) {
            res.status(500).json({ message: "Gagal mengajukan izin", error: error.message });
        }
    },

    // 2. Fungsi untuk Dokter melihat riwayat izin pribadinya
    getRiwayatIzin: async (req, res) => {
        const { userId } = req.params;
        try {
            const [rows] = await db.query(
                "SELECT * FROM pengajuan_izin WHERE user_id = ? ORDER BY created_at DESC", 
                [userId]
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: "Gagal mengambil riwayat izin", error: error.message });
        }
    },

    // 3. Fungsi untuk Superadmin melihat semua pengajuan yang masuk
    getAllIzin: async (req, res) => {
        try {
            const query = `
                SELECT p.*, u.full_name, d.nama as nama_dokter 
                FROM pengajuan_izin p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN dokter d ON u.id = d.user_id
                ORDER BY p.status_approval = 'Pending' DESC, p.created_at DESC
            `;
            const [rows] = await db.query(query);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: "Gagal mengambil data izin", error: error.message });
        }
    },

    // 4. Fungsi Approval oleh Superadmin
    approveIzin: async (req, res) => {
        const { id } = req.params;
        const { action } = req.body; // Isinya: 'Disetujui' atau 'Ditolak'

        // Menggunakan transaction agar jika satu gagal, semua batal (menjaga integritas data)
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // A. Update status di tabel pengajuan_izin
            await connection.query(
                "UPDATE pengajuan_izin SET status_approval = ? WHERE id = ?", 
                [action, id]
            );

            // B. Jika disetujui, otomatis nonaktifkan jadwal dokter
            if (action === 'Disetujui') {
                // Ambil user_id si pengaju
                const [izin] = await connection.query("SELECT user_id FROM pengajuan_izin WHERE id = ?", [id]);
                const requesterId = izin[0].user_id;

                // Cari id dokter berdasarkan user_id tersebut
                const [dokter] = await connection.query("SELECT id FROM dokter WHERE user_id = ?", [requesterId]);
                
                if (dokter.length > 0) {
                    const dokterId = dokter[0].id;
                    // Ubah semua jadwal dokter tersebut menjadi nonaktif
                    await connection.query(
                        "UPDATE jadwal_dokter SET status = 'nonaktif' WHERE dokter_id = ?", 
                        [dokterId]
                    );
                }
            }

            await connection.commit();
            res.json({ message: `Pengajuan izin berhasil di-${action}` });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ message: "Gagal memproses approval", error: error.message });
        } finally {
            connection.release();
        }
    }
};

module.exports = izinController;