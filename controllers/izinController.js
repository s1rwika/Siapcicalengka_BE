const db = require('../config/db');

const izinController = {
    // 1. Fungsi untuk mengajukan izin
    ajukanIzin: async (req, res) => {
        console.log('🔥 === AJUKAN IZIN START ===');
        console.log('Body:', req.body);
        console.log('User dari token:', req.user);
        
        // AMBIL USER_ID DARI TOKEN, bukan dari body
        const user_id = req.user?.id || req.user?.userId || req.user?.user_id;
        const { jenis_izin, tanggal_awal, tanggal_akhir, alasan } = req.body;

        console.log('🔍 User ID dari token:', user_id);
        console.log('🔍 Data dari body:', { jenis_izin, tanggal_awal, tanggal_akhir, alasan });

        // Validasi - JANGAN validasi user_id dari body
        if (!jenis_izin || !tanggal_awal || !tanggal_akhir || !alasan) {
            return res.status(400).json({ 
                success: false,
                message: "Semua field harus diisi kecuali user_id" 
            });
        }

        // Validasi user_id dari token
        if (!user_id) {
            return res.status(401).json({ 
                success: false,
                message: "User ID tidak valid. Silakan login ulang." 
            });
        }

        try {
            // Cek apakah user ada di database
            const [userCheck] = await db.query(
                'SELECT id FROM users WHERE id = ?',
                [user_id]
            );

            if (userCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User tidak ditemukan di database"
                });
            }

            // Insert ke database
            // izinController.js - perbaiki query INSERT
            const [result] = await db.query(
                `INSERT INTO pengajuan_izin 
                (user_id, jenis_izin, tanggal_awal, tanggal_akhir, alasan, status_approval, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())`, // TAMBAHKAN created_at dan NOW()
                [user_id, jenis_izin, tanggal_awal, tanggal_akhir, alasan.trim(), 'Pending']
            );

            console.log('✅ Insert berhasil, ID:', result.insertId);

            // Jika user adalah dokter, auto-nonaktifkan jadwal
            const [dokterCheck] = await db.query(
                'SELECT id FROM dokter WHERE user_id = ?',
                [user_id]
            );

            if (dokterCheck.length > 0) {
                const dokterId = dokterCheck[0].id;
                await db.query(
                    "UPDATE jadwal_dokter SET status = 'nonaktif' WHERE dokter_id = ?", 
                    [dokterId]
                );
                console.log('✅ Jadwal dokter dinonaktifkan');
            }

            res.status(201).json({ 
                success: true,
                message: "Pengajuan izin berhasil dikirim. Status: Pending",
                izin_id: result.insertId
            });

        } catch (error) {
            console.error('🔥 Error ajukanIzin:', error);
            console.error('Error code:', error.code);
            console.error('Error sqlMessage:', error.sqlMessage);
            
            if (error.code === 'ER_BAD_NULL_ERROR') {
                return res.status(400).json({ 
                    success: false,
                    message: "Data tidak lengkap" 
                });
            }
            
            res.status(500).json({ 
                success: false,
                message: "Gagal mengajukan izin",
                error: error.message
            });
        }
    },

    // 2. Fungsi untuk melihat riwayat izin pribadi
    getRiwayatIzin: async (req, res) => {
        try {
            // AMBIL user_id dari token, bukan dari params
            const user_id = req.user?.id || req.user?.userId || req.user?.user_id;
            console.log('📜 Get riwayat untuk user_id:', user_id);
            
            const [rows] = await db.query(
                `SELECT 
                    id,
                    jenis_izin,
                    tanggal_awal,
                    tanggal_akhir,
                    alasan,
                    status_approval,
                    created_at
                 FROM pengajuan_izin 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`, 
                [user_id]
            );

            res.json(rows);
        } catch (error) {
            console.error('Error getRiwayatIzin:', error);
            res.status(500).json({ 
                message: "Gagal mengambil riwayat izin", 
                error: error.message 
            });
        }
    },

    // 3. Fungsi untuk Superadmin melihat semua pengajuan
    getAllIzin: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT 
                    p.id,
                    p.user_id,
                    p.jenis_izin,
                    DATE(p.tanggal_awal) as tanggal_awal,
                    DATE(p.tanggal_akhir) as tanggal_akhir,
                    p.alasan,
                    p.status_approval,
                    p.created_at,
                    u.full_name,
                    u.username,
                    u.role,
                    d.nama as nama_dokter,
                    d.spesialis
                FROM pengajuan_izin p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN dokter d ON u.id = d.user_id
                ORDER BY 
                    CASE p.status_approval 
                        WHEN 'Pending' THEN 1
                        WHEN 'Disetujui' THEN 2
                        WHEN 'Ditolak' THEN 3
                        ELSE 4
                    END,
                    p.created_at DESC
            `);
            res.json(rows);
        } catch (error) {
            console.error('Error getAllIzin:', error);
            res.status(500).json({ 
                message: "Gagal mengambil data izin", 
                error: error.message 
            });
        }
    },

    // 4. Fungsi Approval oleh Superadmin
    approveIzin: async (req, res) => {
        const { id } = req.params;
        const { action } = req.body; // 'Disetujui' atau 'Ditolak'
        
        console.log(`Approval request: ID=${id}, Action=${action}`);

        if (!['Disetujui', 'Ditolak'].includes(action)) {
            return res.status(400).json({ 
                message: "Action harus 'Disetujui' atau 'Ditolak'" 
            });
        }

        try {
            // Cek apakah izin ada
            const [izin] = await db.query(
                "SELECT * FROM pengajuan_izin WHERE id = ?", 
                [id]
            );

            if (izin.length === 0) {
                return res.status(404).json({ 
                    message: "Pengajuan izin tidak ditemukan" 
                });
            }

            // Update status izin
            await db.query(
                "UPDATE pengajuan_izin SET status_approval = ? WHERE id = ?", 
                [action, id]
            );

            // Jika disetujui, nonaktifkan jadwal dokter
            if (action === 'Disetujui') {
                const user_id = izin[0].user_id;
                
                // Cari dokter berdasarkan user_id
                const [dokter] = await db.query(
                    "SELECT id FROM dokter WHERE user_id = ?", 
                    [user_id]
                );
                
                if (dokter.length > 0) {
                    const dokterId = dokter[0].id;
                    await db.query(
                        "UPDATE jadwal_dokter SET status = 'nonaktif' WHERE dokter_id = ?", 
                        [dokterId]
                    );
                    console.log(`✅ Jadwal dokter ID ${dokterId} dinonaktifkan`);
                }
            }

            res.json({ 
                success: true,
                message: `Pengajuan izin berhasil di-${action.toLowerCase()}` 
            });

        } catch (error) {
            console.error('Error approveIzin:', error);
            res.status(500).json({ 
                message: "Gagal memproses approval", 
                error: error.message 
            });
        }
    }
};

module.exports = izinController;