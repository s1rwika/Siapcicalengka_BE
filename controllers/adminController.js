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
    lokasi_id, // UBAH: Frontend harus kirim ID (angka), bukan nama lokasi
    jam_mulai,
    jam_selesai
  } = req.body;

  // VALIDASI WAJIB
  if (!id) {
    return res.status(400).json({
      message: 'ID kegiatan wajib diisi (Format contoh: PY-001)'
    });
  }

  try {
    // Perhatikan: Kolom di DB bernama 'lokasi', tapi isinya harus ID.
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
        lokasi_id, // Masukkan ID lokasi ke kolom 'lokasi'
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
    // Kita JOIN supaya Admin melihat "Nama Lokasi", bukan cuma "Angka ID"
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
    // PERBAIKAN: Gunakan nama kolom yang benar (sama seperti create)
    const { judul, deskripsi, jenis_kegiatan_id, lokasi_id, tanggal, jam_mulai, jam_selesai } = req.body;
    
    // Perhatikan: kolom di DB adalah 'lokasi', kita isi dengan 'lokasi_id'
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

// 4. GET ALL LOKASI (Hanya satu fungsi saja, jangan duplikat)
exports.getAllLokasi = async (req, res) => {
  try {
    // Pastikan nama kolom di tabel lokasi Anda benar (misal: nama_lokasi)
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
        // JOIN agar saat cetak muncul Nama Lokasi, bukan ID
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