// controllers/petaController.js - HAPUS semua isinya, ganti dengan:

const db = require('../config/db');

// ===============================
// GET kegiatan akan datang (disetujui)
// ===============================
exports.getKegiatanAkanDatang = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    // Gunakan LEFT JOIN untuk menghindari masalah jika data relasi tidak lengkap
    const [rows] = await db.query(
      `SELECT 
        k.judul,
        IFNULL(k.deskripsi, '') as deskripsi,
        IFNULL(jk.jenis_kegiatan, 'Tidak diketahui') as jenis_kegiatan,
        DATE(k.tanggal) as tanggal,
        k.jam_mulai,
        k.jam_selesai,
        IFNULL(u.full_name, 'Tidak diketahui') as full_name
      FROM kegiatan k
      LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
      LEFT JOIN users u ON k.user_id = u.id
      WHERE k.status = 'disetujui' 
        AND k.lokasi = ?
        AND (k.tanggal >= CURDATE())
      ORDER BY k.tanggal ASC, k.jam_mulai ASC`,
      [lokasiId]
    );

    // Format hasil sesuai struktur yang diinginkan
    const formattedRows = rows.map(row => ({
      judul: row.judul,
      deskripsi: row.deskripsi,
      jenis_kegiatan: row.jenis_kegiatan,
      tanggal: row.tanggal,
      jam_mulai: row.jam_mulai,
      jam_selesai: row.jam_selesai,
      full_name: row.full_name
    }));

    res.json(formattedRows);

  } catch (err) {
    console.error('Error getKegiatanAkanDatang:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil kegiatan akan datang', 
      error: err.message 
    });
  }
};

// ===============================
// GET laporan selesai berdasarkan lokasi
// ===============================
exports.getKegiatanSelesai = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        l.id as id_laporan,
        l.judul_laporan,
        l.nama_file,
        l.detail_kegiatan,
        DATE(l.tanggal) as tanggal_laporan,
        k.judul,
        IFNULL(k.deskripsi, '') as deskripsi,
        IFNULL(jk.jenis_kegiatan, 'Tidak diketahui') as jenis_kegiatan,
        DATE(k.tanggal) as tanggal,
        k.jam_mulai,
        k.jam_selesai,
        IFNULL(u.full_name, 'Tidak diketahui') as full_name
      FROM laporan l
      LEFT JOIN kegiatan k ON l.kegiatan_id = k.id
      LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
      LEFT JOIN users u ON k.user_id = u.id
      WHERE k.lokasi = ?
        AND k.status = 'disetujui'
        AND k.tanggal < CURDATE()
      ORDER BY l.tanggal DESC`,
      [lokasiId]
    );

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    const formattedRows = rows.map(row => ({
      id_laporan: row.id_laporan,
      judul_laporan: row.judul_laporan,
      nama_file: row.nama_file,
      detail_kegiatan: row.detail_kegiatan,
      tanggal_laporan: row.tanggal_laporan,
      kegiatan: {
        judul: row.judul,
        deskripsi: row.deskripsi,
        jenis_kegiatan: row.jenis_kegiatan,
        tanggal: row.tanggal,
        jam_mulai: row.jam_mulai,
        jam_selesai: row.jam_selesai,
        full_name: row.full_name
      }
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error('Error getKegiatanSelesai:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil laporan', 
      error: err.message 
    });
  }
};