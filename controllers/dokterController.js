const db = require('../config/db');

/**
 * Helper: Mendapatkan nama hari dalam Bahasa Indonesia
 */
const getIndonesianDay = () => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
};

/**
 * Helper: Mendapatkan waktu format HH:mm:ss
 */
const getMySQLTime = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// --- A. AMBIL SEMUA JADWAL DOKTER ---
exports.getMySchedule = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT jd.hari, jd.jam_mulai, jd.jam_selesai, p.nama_poli, jd.status
      FROM jadwal_dokter jd
      JOIN dokter d ON jd.dokter_id = d.id
      JOIN poli p ON d.poli_id = p.id
      WHERE d.user_id = ?
      ORDER BY FIELD(jd.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), jd.jam_mulai ASC
    `, [userId]);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- B. CEK STATUS SAAT INI & AUTO-OFF ---
// Fungsi ini dipanggil saat dokter membuka dashboard (untuk sinkronisasi status)
exports.getMyCurrentStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const [dokterRows] = await db.query('SELECT id FROM dokter WHERE user_id = ?', [userId]);
    if (dokterRows.length === 0) return res.status(404).json({ message: 'Dokter tidak ditemukan' });

    const dokterId = dokterRows[0].id;
    const hariIni = getIndonesianDay();
    const jamSekarang = getMySQLTime();

    // Ambil jadwal khusus hari ini
    const [rows] = await db.query(
      'SELECT id, status, jam_mulai, jam_selesai FROM jadwal_dokter WHERE dokter_id = ? AND hari = ?',
      [dokterId, hariIni]
    );

    if (rows.length === 0) return res.json({ status: 'Libur', message: 'Tidak ada jadwal hari ini.' });

    let activeNow = null;
    let nextStart = null;

    for (let j of rows) {
      // LOGIKA AUTO-OFF: Jika jam selesai sudah lewat tapi status masih 'aktif', ubah ke 'nonaktif'
      if (jamSekarang > j.jam_selesai && j.status === 'aktif') {
        await db.query('UPDATE jadwal_dokter SET status = "nonaktif" WHERE id = ?', [j.id]);
        j.status = 'nonaktif';
      }

      // Cek apakah sekarang masuk dalam rentang jam praktek
      if (jamSekarang >= j.jam_mulai && jamSekarang <= j.jam_selesai) {
        activeNow = j;
      }
      
      // Cek jadwal terdekat berikutnya
      if (jamSekarang < j.jam_mulai && (!nextStart || j.jam_mulai < nextStart)) {
        nextStart = j.jam_mulai;
      }
    }

    if (activeNow) {
      return res.json({ 
        status: activeNow.status, 
        jam_mulai: activeNow.jam_mulai, 
        jam_selesai: activeNow.jam_selesai 
      });
    }

    if (nextStart) {
      return res.json({ status: 'Belum Waktunya', message: `Mulai jam ${nextStart.substring(0, 5)}` });
    }

    res.json({ status: 'Selesai', message: 'Jadwal hari ini sudah berakhir.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- C. UPDATE STATUS MANUAL (AKTIF/NONAKTIF) ---
exports.updateStatusKehadiran = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.body; // Input: 'aktif' atau 'nonaktif'

  try {
    const [dokterRows] = await db.query('SELECT id FROM dokter WHERE user_id = ?', [userId]);
    if (dokterRows.length === 0) return res.status(404).json({ message: 'Dokter tidak ditemukan' });

    const dokterId = dokterRows[0].id;
    const hariIni = getIndonesianDay();
    const jamSekarang = getMySQLTime();

    // Validasi: Perubahan status hanya bisa dilakukan pada jam operasional yang sedang berjalan
    const [result] = await db.query(
      `UPDATE jadwal_dokter 
       SET status = ? 
       WHERE dokter_id = ? AND hari = ? AND ? BETWEEN jam_mulai AND jam_selesai`,
      [status, dokterId, hariIni, jamSekarang]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        message: 'Gagal! Anda hanya bisa mengubah status pada jam praktek yang sedang berlangsung.' 
      });
    }

    res.json({ message: `Status berhasil diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- D. RIWAYAT & INFORMASI LAIN ---
exports.getMyStatusHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const [dokterRows] = await db.query('SELECT id FROM dokter WHERE user_id = ?', [userId]);
    if (dokterRows.length === 0) return res.status(404).json({ message: 'Dokter tidak ditemukan' });

    const [rows] = await db.query(
      'SELECT * FROM dokter_status WHERE dokter_id = ? ORDER BY created_at DESC', 
      [dokterRows[0].id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDokterByPoli = async (req, res) => {
  const { poliId } = req.params;
  try {
    const [rows] = await db.query('SELECT id, nama, spesialis FROM dokter WHERE poli_id = ?', [poliId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};