const db = require("../config/db");

exports.absen = (req, res) => {
    const userId = req.body.user_id;
    const now = new Date();

    // ambil jam kerja aktif
    const jamQuery = `
        SELECT jam_mulai, jam_selesai
        FROM jam_kerja
        WHERE aktif = 1
        LIMIT 1
    `;

    db.query(jamQuery, (err, jamResult) => {
        if (err) return res.status(500).json(err);
        if (jamResult.length === 0) {
            return res.status(400).json({ message: "Jam kerja belum diatur" });
        }

        const { jam_mulai, jam_selesai } = jamResult[0];

        // konversi jam ke menit
        const toMinute = time =>
            time.split(":")[0] * 60 + parseInt(time.split(":")[1]);

        const menitSekarang = now.getHours() * 60 + now.getMinutes();
        const menitMulai = toMinute(jam_mulai);
        const menitSelesai = toMinute(jam_selesai);

        // ❌ di luar jam kerja
        if (menitSekarang < menitMulai || menitSekarang > menitSelesai) {
            return res.status(403).json({
                message: "Di luar jam absensi",
                status: "nonaktif"
            });
        }

        const today = now.toISOString().split("T")[0];

        // cek sudah absen hari ini
        const cekQuery = `
            SELECT id FROM absensi
            WHERE user_id = ?
            AND DATE(waktu_absen) = ?
        `;

        db.query(cekQuery, [userId, today], (err, cek) => {
            if (err) return res.status(500).json(err);

            if (cek.length > 0) {
                return res.json({
                    message: "Sudah absen hari ini",
                    status: "aktif"
                });
            }

            // simpan absensi
            const insertQuery = `
                INSERT INTO absensi (user_id, waktu_absen, status)
                VALUES (?, ?, 'aktif')
            `;

            db.query(insertQuery, [userId, now], err => {
                if (err) return res.status(500).json(err);

                res.json({
                    message: "Absensi berhasil",
                    status: "aktif"
                });
            });
        });
    });
};
