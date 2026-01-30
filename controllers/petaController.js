// controllers/petaController.js

const db = require('../config/db');

// ===============================
// GET kegiatan akan datang (disetujui) - BULAN INI SAJA
// ===============================
exports.getKegiatanAkanDatang = async (req, res) => {
  const { lokasiId } = req.params

  try {
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
        AND k.tanggal >= DATE_FORMAT(CURDATE(), '%Y-%m-01')  -- AWAL BULAN INI
        AND k.tanggal >= CURDATE()  -- HANYA YANG MASIH AKAN DATANG
      ORDER BY k.tanggal ASC, k.jam_mulai ASC`,
      [lokasiId]
    )

    const formattedRows = rows.map(row => ({
      judul: row.judul,
      deskripsi: row.deskripsi,
      jenis_kegiatan: row.jenis_kegiatan,
      tanggal: row.tanggal,
      jam_mulai: row.jam_mulai,
      jam_selesai: row.jam_selesai,
      full_name: row.full_name
    }))

    // Log untuk debugging
    const today = new Date();
    const monthName = today.toLocaleString('id-ID', { month: 'long' });
    const year = today.getFullYear();
    
    console.log(`[AKAN DATANG] Lokasi ${lokasiId}: ${rows.length} kegiatan (${monthName} ${year})`);
    res.json(formattedRows)
  } catch (err) {
    console.error('Error getAkanDatangByLokasi:', err)
    res.status(500).json({ 
      message: 'Gagal mengambil kegiatan akan datang', 
      error: err.message 
    })
  }
};

// ===============================
// GET laporan selesai berdasarkan lokasi - BULAN INI SAJA
// HANYA YANG STATUS 'DISETUJUI' (baik kegiatan maupun laporan)
// ===============================
// GET laporan selesai - FIXED VERSION
// ===============================
exports.getKegiatanSelesai = async (req, res) => {
  const { lokasiId } = req.params

  try {
    console.log('=== QUERY LOKASI ' + lokasiId + ' ===');
    
    // Untuk debugging: cek waktu server
    const [serverTime] = await db.query('SELECT CURDATE() as today, NOW() as now');
    console.log('Waktu server:', serverTime[0]);

    // QUERY YANG BENAR: Hilangkan filter "kurang dari hari ini"
    const [rows] = await db.query(
      `SELECT 
        l.id as id_laporan,
        l.nama_file,
        l.judul_laporan,
        l.detail_kegiatan,
        l.pdf_file,
        l.status as status_laporan,
        DATE(l.tanggal) as tanggal_laporan,
        l.img,
        k.judul as judul_kegiatan,
        k.deskripsi as deskripsi_kegiatan,
        DATE(k.tanggal) as tanggal_kegiatan,
        k.jam_mulai,
        k.jam_selesai,
        k.jenis_kegiatan_id,
        k.status as status_kegiatan,
        IFNULL(jk.jenis_kegiatan, 'Tidak diketahui') as jenis_kegiatan,
        IFNULL(u.full_name, 'Tidak diketahui') as full_name
      FROM laporan l
      JOIN kegiatan k ON l.kegiatan_id = k.id
      LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
      LEFT JOIN users u ON k.user_id = u.id
      WHERE k.lokasi = ?
        AND k.status = 'disetujui'
        AND l.status = 'disetujui'
        AND DATE(k.tanggal) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        -- HAPUS: AND DATE(k.tanggal) < CURDATE()
      ORDER BY l.tanggal DESC`,
      [lokasiId]
    );

    console.log('Hasil query:', rows.length, 'data');

    // Format response
    const formattedRows = rows.map(row => {
      let imgBase64 = null;
      if (row.img) {
        try {
          if (Buffer.isBuffer(row.img)) {
            imgBase64 = row.img.toString('base64');
          }
        } catch (err) {
          console.error('Error processing image:', err);
        }
      }

      return {
        id_laporan: row.id_laporan,
        judul_laporan: row.judul_laporan,
        nama_file: row.nama_file,
        detail_kegiatan: row.detail_kegiatan,
        tanggal_laporan: row.tanggal_laporan,
        pdf_file: row.pdf_file,
        status_laporan: row.status_laporan,
        img: imgBase64,
        kegiatan: {
          judul: row.judul_kegiatan,
          deskripsi: row.deskripsi_kegiatan,
          jenis_kegiatan: row.jenis_kegiatan,
          tanggal: row.tanggal_kegiatan,
          jam_mulai: row.jam_mulai,
          jam_selesai: row.jam_selesai,
          status_kegiatan: row.status_kegiatan,
          full_name: row.full_name
        }
      };
    });

    console.log('Data dikirim:', formattedRows.length);
    res.json(formattedRows);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil laporan selesai', 
      error: err.message 
    });
  }
};

// ===============================
// VERSI OPTIONAL: Jika ingin fleksibel dengan bulan tertentu
// ===============================
exports.getKegiatanByMonth = async (req, res) => {
  const { lokasiId } = req.params;
  const { year, month, type = 'akan-datang' } = req.query;

  try {
    // Jika tidak ada parameter, gunakan bulan ini
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Format: YYYY-MM-01 untuk awal bulan
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    
    // Hitung akhir bulan
    const [endDateResult] = await db.query(
      'SELECT LAST_DAY(?) as last_day',
      [startDate]
    );
    const endDate = endDateResult[0].last_day;

    let query = '';
    let params = [lokasiId, startDate, endDate];
    
    if (type === 'akan-datang') {
      query = `
        SELECT 
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
          AND k.tanggal BETWEEN ? AND ?
          AND k.tanggal >= CURDATE()
        ORDER BY k.tanggal ASC, k.jam_mulai ASC
      `;
      
    } else if (type === 'selesai') {
      query = `
        SELECT 
          l.id as id_laporan,
          l.nama_file,
          l.judul_laporan,
          l.detail_kegiatan,
          l.pdf_file,
          l.status as status_laporan,
          DATE(l.tanggal) as tanggal_laporan,
          l.img,
          k.judul as judul_kegiatan,
          k.deskripsi as deskripsi_kegiatan,
          k.tanggal as tanggal_kegiatan,
          k.jam_mulai,
          k.jam_selesai,
          k.jenis_kegiatan_id,
          k.status as status_kegiatan,
          IFNULL(jk.jenis_kegiatan, 'Tidak diketahui') as jenis_kegiatan,
          IFNULL(u.full_name, 'Tidak diketahui') as full_name
        FROM laporan l
        JOIN kegiatan k ON l.kegiatan_id = k.id
        LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
        LEFT JOIN users u ON k.user_id = u.id
        WHERE k.lokasi = ?
          AND k.status = 'disetujui'
          AND l.status = 'disetujui'
          AND k.tanggal BETWEEN ? AND ?
          AND k.tanggal < CURDATE()
        ORDER BY l.tanggal DESC
      `;
    }

    const [rows] = await db.query(query, params);

    // Proses formatting seperti di atas...
    // ... (sama seperti di atas)

    res.json(formattedRows);
    
  } catch (err) {
    console.error('Error getKegiatanByMonth:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil data', 
      error: err.message 
    });
  }
};