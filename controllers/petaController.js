// controllers/petaController.js

const db = require('../config/db');

// ===============================
// GET kegiatan akan datang (disetujui) - BULAN INI SAJA
// ===============================
exports.getKegiatanAkanDatang = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    // Ambil tanggal awal dan akhir bulan ini
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
        AND k.tanggal <= LAST_DAY(CURDATE())  -- AKHIR BULAN INI
        AND k.tanggal >= CURDATE()  -- HANYA YANG MASIH AKAN DATANG
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

    // Dapatkan info bulan dan tahun untuk logging
    const today = new Date();
    const monthName = today.toLocaleString('id-ID', { month: 'long' });
    const year = today.getFullYear();
    
    console.log(`[AKAN DATANG] Lokasi ${lokasiId}: ${rows.length} kegiatan (${monthName} ${year})`);
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
// GET laporan selesai berdasarkan lokasi - BULAN INI + 1 MINGGU
// ===============================
exports.getKegiatanSelesai = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    // Hitung: awal bulan ini sampai (akhir bulan ini + 1 minggu)
    const [rows] = await db.query(
      `SELECT 
        l.id as id_laporan,
        l.judul_laporan,
        l.nama_file,
        l.detail_kegiatan,
        DATE(l.tanggal) as tanggal_laporan,
        l.img,  -- Tambahkan kolom img untuk gambar
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
        AND k.tanggal < CURDATE()  -- HANYA YANG SUDAH SELESAI
        AND k.tanggal >= DATE_FORMAT(CURDATE(), '%Y-%m-01')  -- AWAL BULAN INI
        AND k.tanggal <= DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 7 DAY)  -- AKHIR BULAN + 1 MINGGU
      ORDER BY l.tanggal DESC`,
      [lokasiId]
    );

    if (!rows || rows.length === 0) {
      const today = new Date();
      const monthName = today.toLocaleString('id-ID', { month: 'long' });
      const year = today.getFullYear();
      
      console.log(`[SELESAI] Lokasi ${lokasiId}: 0 laporan (${monthName} ${year} + 1 minggu)`);
      return res.json([]);
    }

    const formattedRows = rows.map(row => {
      // Konversi blob ke base64 jika ada gambar
      let imgBase64 = null;
      if (row.img && row.img.length > 0) {
        try {
          imgBase64 = Buffer.from(row.img).toString('base64');
        } catch (imgErr) {
          console.error('Error converting image to base64:', imgErr);
          imgBase64 = null;
        }
      }

      return {
        id_laporan: row.id_laporan,
        judul_laporan: row.judul_laporan,
        nama_file: row.nama_file,
        detail_kegiatan: row.detail_kegiatan,
        tanggal_laporan: row.tanggal_laporan,
        img: imgBase64,  // Tambahkan gambar
        kegiatan: {
          judul: row.judul,
          deskripsi: row.deskripsi,
          jenis_kegiatan: row.jenis_kegiatan,
          tanggal: row.tanggal,
          jam_mulai: row.jam_mulai,
          jam_selesai: row.jam_selesai,
          full_name: row.full_name
        }
      };
    });

    const today = new Date();
    const monthName = today.toLocaleString('id-ID', { month: 'long' });
    const year = today.getFullYear();
    
    console.log(`[SELESAI] Lokasi ${lokasiId}: ${rows.length} laporan (${monthName} ${year} + 1 minggu)`);
    res.json(formattedRows);
    
  } catch (err) {
    console.error('Error getKegiatanSelesai:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil laporan', 
      error: err.message 
    });
  }
};

// ===============================
// VERSI FLEKSIBEL: BISA PILIH BULAN & TAMBAHAN MINGGU
// ===============================
exports.getKegiatanByMonth = async (req, res) => {
  const { lokasiId } = req.params;
  const { 
    year = new Date().getFullYear(), 
    month = new Date().getMonth() + 1,
    extraWeeks = 0, // 0 untuk akan-datang, 1 untuk selesai
    type = 'akan-datang' 
  } = req.query;

  try {
    // Format tanggal: YYYY-MM-01 untuk awal bulan
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // Hitung akhir bulan
    const endDateQuery = await db.query(
      'SELECT LAST_DAY(?) as last_day',
      [startDate]
    );
    const lastDay = endDateQuery[0][0].last_day;
    
    // Tambahan minggu untuk selesai
    let endDate = lastDay;
    if (parseInt(extraWeeks) > 0) {
      const [extendedDate] = await db.query(
        'SELECT DATE_ADD(?, INTERVAL ? DAY) as extended_date',
        [lastDay, parseInt(extraWeeks) * 7]
      );
      endDate = extendedDate[0].extended_date;
    }

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
          AND (k.tanggal BETWEEN ? AND ?)
          AND (k.tanggal >= CURDATE())
        ORDER BY k.tanggal ASC, k.jam_mulai ASC
      `;
      
    } else if (type === 'selesai') {
      query = `
        SELECT 
          l.id as id_laporan,
          l.judul_laporan,
          l.nama_file,
          l.detail_kegiatan,
          DATE(l.tanggal) as tanggal_laporan,
          l.img,
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
          AND (k.tanggal BETWEEN ? AND ?)
          AND k.tanggal < CURDATE()
        ORDER BY l.tanggal DESC
      `;
    }

    const [rows] = await db.query(query, params);

    if (!rows || rows.length === 0) {
      const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
      console.log(`[${type.toUpperCase()}] Lokasi ${lokasiId}: 0 data (${monthName} ${year}${extraWeeks > 0 ? ` + ${extraWeeks} minggu` : ''})`);
      return res.json([]);
    }

    let formattedRows;
    
    if (type === 'akan-datang') {
      formattedRows = rows.map(row => ({
        judul: row.judul,
        deskripsi: row.deskripsi,
        jenis_kegiatan: row.jenis_kegiatan,
        tanggal: row.tanggal,
        jam_mulai: row.jam_mulai,
        jam_selesai: row.jam_selesai,
        full_name: row.full_name
      }));
    } else {
      formattedRows = rows.map(row => {
        let imgBase64 = null;
        if (row.img && row.img.length > 0) {
          try {
            imgBase64 = Buffer.from(row.img).toString('base64');
          } catch (imgErr) {
            console.error('Error converting image to base64:', imgErr);
            imgBase64 = null;
          }
        }

        return {
          id_laporan: row.id_laporan,
          judul_laporan: row.judul_laporan,
          nama_file: row.nama_file,
          detail_kegiatan: row.detail_kegiatan,
          tanggal_laporan: row.tanggal_laporan,
          img: imgBase64,
          kegiatan: {
            judul: row.judul,
            deskripsi: row.deskripsi,
            jenis_kegiatan: row.jenis_kegiatan,
            tanggal: row.tanggal,
            jam_mulai: row.jam_mulai,
            jam_selesai: row.jam_selesai,
            full_name: row.full_name
          }
        };
      });
    }

    const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
    console.log(`[${type.toUpperCase()}] Lokasi ${lokasiId}: ${rows.length} data (${monthName} ${year}${extraWeeks > 0 ? ` + ${extraWeeks} minggu` : ''})`);
    res.json(formattedRows);
    
  } catch (err) {
    console.error('Error getKegiatanByMonth:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil data', 
      error: err.message 
    });
  }
};