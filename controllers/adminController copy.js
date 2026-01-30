const db = require('../config/db');

// --- MANAJEMEN KEGIATAN ---

// 1. CREATE KEGIATAN
exports.createKegiatan = async (req, res) => {
  const {
    id,
    judul,
    deskripsi,
    jenis_kegiatan_id,
    tanggal,
    lokasi_id,
    jam_mulai,
    jam_selesai
  } = req.body;

  if (!id) {
    return res.status(400).json({
      message: 'ID kegiatan wajib diisi (Format contoh: PY-001)'
    });
  }

  try {
    await db.query(
      `INSERT INTO kegiatan
      (id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        judul,
        deskripsi,
        jenis_kegiatan_id,
        tanggal,
        lokasi_id,
        req.user.id,
        jam_mulai,
        jam_selesai,
        'menunggu'
      ]
    );

    res.status(201).json({
      message: 'Kegiatan berhasil dibuat',
      id
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: `ID kegiatan ${id} sudah digunakan`
      });
    }
    res.status(500).json({ error: error.message });
  }
};

// 2. GET ALL KEGIATAN (ADMIN)
exports.getAllKegiatanAdmin = async (req, res) => {
  try {
    const sql = `
        SELECT 
            k.*, 
            jk.jenis_kegiatan,
            l.nama_lokasi 
        FROM kegiatan k
        LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
        LEFT JOIN lokasi l ON k.lokasi = l.id
        ORDER BY k.tanggal DESC
    `;
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. UPDATE KEGIATAN
exports.updateKegiatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, deskripsi, jenis_kegiatan_id, lokasi_id, tanggal, jam_mulai, jam_selesai } = req.body;
    
    const sql = `
        UPDATE kegiatan 
        SET judul = ?, deskripsi = ?, jenis_kegiatan_id = ?, lokasi = ?, tanggal = ?, jam_mulai = ?, jam_selesai = ? 
        WHERE id = ?`;
        
    const [result] = await db.query(sql, [judul, deskripsi, jenis_kegiatan_id, lokasi_id, tanggal, jam_mulai, jam_selesai, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }
    
    res.json({ message: 'Kegiatan berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- DATA MASTER: LOKASI ---

// 4. GET ALL LOKASI
exports.getAllLokasi = async (req, res) => {
  try {
    const sql = 'SELECT * FROM lokasi ORDER BY nama_lokasi ASC'; 
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- LAPORAN KEGIATAN ---

exports.createLaporan = async (req, res) => {
    const { kegiatan_id, nama_file, judul_laporan, detail_kegiatan } = req.body;
    const imgPlaceholder = req.file ? req.file.buffer : null; 

    try {
        await db.query(
            'INSERT INTO laporan (kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img) VALUES (?, ?, ?, ?, ?)',
            [kegiatan_id, nama_file, judul_laporan, detail_kegiatan, imgPlaceholder || '']
        );
        res.status(201).json({ message: 'Detail laporan berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCetakLaporanData = async (req, res) => {
    const { kegiatan_id } = req.params;
    try {
        const [data] = await db.query(`
            SELECT k.judul, k.tanggal, lk.nama_lokasi as lokasi, l.judul_laporan, l.detail_kegiatan, l.nama_file
            FROM kegiatan k
            JOIN laporan l ON k.id = l.kegiatan_id
            LEFT JOIN lokasi lk ON k.lokasi = lk.id
            WHERE k.id = ?
        `, [kegiatan_id]);

        if (data.length === 0) return res.status(404).json({ message: 'Data laporan tidak ditemukan' });

        res.json(data[0]); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- RIWAYAT PASIEN ---

exports.getRiwayatPasien = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT rp.*, u.full_name as nama_dokter 
            FROM riwayat_pasien rp
            LEFT JOIN users u ON rp.dokter_id = u.id
            ORDER BY rp.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addRiwayatPasien = async (req, res) => {
    const { pasien_nama, dokter_id, diagnosis, tindakan, tanggal } = req.body;
    try {
        await db.query(
            'INSERT INTO riwayat_pasien (pasien_nama, dokter_id, diagnosis, tindakan, tanggal) VALUES (?, ?, ?, ?, ?)',
            [pasien_nama, dokter_id, diagnosis, tindakan, tanggal]
        );
        res.status(201).json({ message: 'Riwayat pasien berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ===============================
// GET kegiatan akan datang (disetujui) - PERBAIKAN UTAMA
// ===============================
exports.getAkanDatangByLokasi = async (req, res) => {
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

    // Debug log untuk melihat hasil query
    console.log('Query result rows count:', rows.length);
    console.log('Query result sample:', rows.length > 0 ? rows[0] : 'No data');

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

    console.log('Formatted rows count:', formattedRows.length);
    res.json(formattedRows);

  } catch (err) {
    console.error('Error getAkanDatangByLokasi:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil kegiatan akan datang', 
      error: err.message 
    });
  }
};

// ===============================
// GET laporan selesai berdasarkan lokasi - DENGAN KONVERSI GAMBAR
// ===============================
exports.getSelesaiByLokasi = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    console.log(`Fetching laporan selesai for lokasi: ${lokasiId}`);
    
    // Query SEDERHANA langsung dari tabel laporan
    const [rows] = await db.query(
      `SELECT 
        l.id as id_laporan,
        l.nama_file,
        l.judul_laporan,
        l.detail_kegiatan,
        DATE(l.tanggal) as tanggal_laporan,
        l.img,
        k.judul as judul_kegiatan,
        k.deskripsi as deskripsi_kegiatan,
        k.tanggal as tanggal_kegiatan,
        k.jam_mulai,
        k.jam_selesai,
        k.jenis_kegiatan_id,
        u.full_name
      FROM laporan l
      JOIN kegiatan k ON l.kegiatan_id = k.id
      LEFT JOIN users u ON k.user_id = u.id
      WHERE k.lokasi = ?
      ORDER BY l.tanggal DESC`,
      [lokasiId]
    );

    console.log(`Found ${rows.length} laporan for lokasi ${lokasiId}`);
    
    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    // Format hasil sesuai struktur yang diharapkan frontend
    const formattedRows = rows.map(row => {
      // Konversi BLOB ke Base64 jika ada gambar
      let imgBase64 = null;
      if (row.img && row.img.length > 0) {
        try {
          // Buffer.from() untuk mengonversi BLOB ke Base64
          imgBase64 = Buffer.from(row.img).toString('base64');
          console.log(`Image converted to base64, size: ${imgBase64.length} chars`);
        } catch (imgErr) {
          console.error('Error converting image to base64:', imgErr);
          imgBase64 = null;
        }
      } else {
        console.log('No image data or empty BLOB');
      }

      return {
        id_laporan: row.id_laporan,
        judul_laporan: row.judul_laporan || 'Laporan Kegiatan',
        nama_file: row.nama_file || '',
        detail_kegiatan: row.detail_kegiatan || '',
        tanggal_laporan: row.tanggal_laporan || '',
        img: imgBase64, // Sekarang dalam format Base64
        kegiatan: {
          judul: row.judul_kegiatan || 'Kegiatan',
          deskripsi: row.deskripsi_kegiatan || '',
          jenis_kegiatan: `Jenis ID: ${row.jenis_kegiatan_id}`,
          tanggal: row.tanggal_kegiatan ? new Date(row.tanggal_kegiatan).toISOString().split('T')[0] : '',
          jam_mulai: row.jam_mulai || '',
          jam_selesai: row.jam_selesai || '',
          full_name: row.full_name || 'User ID belum tersedia'
        }
      };
    });

    console.log(`Returning ${formattedRows.length} formatted laporan`);
    res.json(formattedRows);

  } catch (err) {
    console.error('Error getSelesaiByLokasi:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil laporan selesai', 
      error: err.message
    });
  }
};


// ===============================
// GET semua kegiatan berdasarkan lokasi (opsional)
// ===============================
exports.getAllKegiatanByLokasi = async (req, res) => {
  const { lokasiId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        k.id,
        k.judul,
        IFNULL(k.deskripsi, '') as deskripsi,
        IFNULL(jk.jenis_kegiatan, 'Tidak diketahui') as jenis_kegiatan,
        DATE(k.tanggal) as tanggal,
        k.jam_mulai,
        k.jam_selesai,
        k.status,
        IFNULL(u.full_name, 'Tidak diketahui') as full_name,
        IFNULL(lok.nama_lokasi, 'Tidak diketahui') as lokasi_nama
      FROM kegiatan k
      LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
      LEFT JOIN users u ON k.user_id = u.id
      LEFT JOIN lokasi lok ON k.lokasi = lok.id
      WHERE k.lokasi = ?
      ORDER BY k.tanggal DESC, k.jam_mulai DESC`,
      [lokasiId]
    );

    const formattedRows = rows.map(row => ({
      id: row.id,
      judul: row.judul,
      deskripsi: row.deskripsi,
      jenis_kegiatan: row.jenis_kegiatan,
      tanggal: row.tanggal,
      jam_mulai: row.jam_mulai,
      jam_selesai: row.jam_selesai,
      status: row.status,
      full_name: row.full_name,
      lokasi: row.lokasi_nama
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error('Error getAllKegiatanByLokasi:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil semua kegiatan', 
      error: err.message 
    });
  }
};