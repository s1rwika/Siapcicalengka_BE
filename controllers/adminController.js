const db = require('../config/db');

// --- MANAJEMEN KEGIATAN ---
exports.createKegiatan = async (req, res) => {
  const {
    id,
    judul,
    deskripsi,
    jenis_kegiatan_id,
    tanggal,
    lokasi,
    jam_mulai,
    jam_selesai
  } = req.body;

  // VALIDASI WAJIB
  if (!id) {
    return res.status(400).json({
      message: 'ID kegiatan wajib diisi'
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
        lokasi,
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
    // ERROR KHUSUS DUPLICATE
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: `ID kegiatan ${id} sudah digunakan`
      });
    }

    res.status(500).json({ error: error.message });
  }
};

// Fix for getAllLokasi - use async/await instead of callback
exports.getAllLokasi = async (req, res) => {
  try {
    const sql = 'SELECT id, nama AS nama_lokasi FROM lokasi ORDER BY nama ASC';
    const [results] = await db.query(sql); // Use await, not callback
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Also fix getAllKegiatanAdmin (if it exists)
exports.getAllKegiatanAdmin = async (req, res) => {
  try {
    const sql = 'SELECT * FROM kegiatan ORDER BY created_at DESC';
    const [results] = await db.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// And updateKegiatan
exports.updateKegiatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kegiatan, lokasi_id, tanggal, waktu } = req.body;
    
    const sql = 'UPDATE kegiatan SET nama_kegiatan = ?, lokasi_id = ?, tanggal = ?, waktu = ? WHERE id = ?';
    const [result] = await db.query(sql, [nama_kegiatan, lokasi_id, tanggal, waktu, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }
    
    res.json({ message: 'Kegiatan berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// --- LAPORAN KEGIATAN ---
exports.createLaporan = async (req, res) => {
    const { kegiatan_id, nama_file, judul_laporan, detail_kegiatan } = req.body;
    // img bisa ditangani middleware upload seperti Multer, di sini kita simpan placeholder/path
    const imgPlaceholder = req.file ? req.file.buffer : null; // Jika menggunakan multer memory storage

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
        // Mengambil data gabungan untuk dicetak
        const [data] = await db.query(`
            SELECT k.judul, k.tanggal, k.lokasi, l.judul_laporan, l.detail_kegiatan, l.nama_file
            FROM kegiatan k
            JOIN laporan l ON k.id = l.kegiatan_id
            WHERE k.id = ?
        `, [kegiatan_id]);

        if (data.length === 0) return res.status(404).json({ message: 'Data laporan tidak ditemukan' });

        res.json(data[0]); // Frontend akan menggunakan data ini untuk window.print() atau generate PDF
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllLokasi = (req, res) => {
  const sql = 'SELECT id, nama FROM lokasi ORDER BY nama ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
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