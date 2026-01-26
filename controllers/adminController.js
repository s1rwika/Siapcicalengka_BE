const db = require('../config/db')

/* =====================================================
   ================= MANAJEMEN KEGIATAN =================
   ===================================================== */

/* =====================================================
   ================= MANAJEMEN KEGIATAN =================
   ===================================================== */

// CREATE KEGIATAN (ADMIN)
exports.createKegiatan = async (req, res) => {
  const {
    id,
    judul,
    deskripsi,
    jenis_kegiatan_id,
    tanggal,
    lokasi_id,
    jam_mulai,
    jam_selesai,
    user_id  // TAMBAHKAN: Ambil dari req.body, bukan req.user.id
  } = req.body

  console.log('Request body:', req.body); // Debug
  console.log('User dari token:', req.user); // Debug

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID kegiatan wajib diisi (Format contoh: PY-001)'
    })
  }

  // Validasi required fields
  if (!judul || !jenis_kegiatan_id || !tanggal || !lokasi_id || !user_id) {
    return res.status(400).json({
      success: false,
      message: 'Semua field wajib diisi kecuali deskripsi'
    })
  }

  try {
    // Gunakan user_id dari form (dropdown), bukan dari token
    const [result] = await db.query(
      `INSERT INTO kegiatan 
      (id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        judul,
        deskripsi || null, // Jika deskripsi kosong, set null
        jenis_kegiatan_id,
        tanggal,
        lokasi_id,
        user_id, // Menggunakan user_id dari dropdown, bukan req.user.id
        jam_mulai || '08:00:00', // Default jika kosong
        jam_selesai || '10:00:00', // Default jika kosong
        'menunggu' // Status otomatis 'menunggu'
      ]
    )

    res.status(201).json({
      success: true,
      message: 'Kegiatan berhasil dibuat',
      id: id,
      insertId: result.insertId
    })

  } catch (error) {
    console.error('Error createKegiatan:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: `ID kegiatan ${id} sudah digunakan`
      })
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Data referensi tidak valid (lokasi/jenis kegiatan/user tidak ditemukan)'
      })
    }
    
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({
        success: false,
        message: 'Format data tidak valid'
      })
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat kegiatan',
      error: error.message,
      code: error.code,
      sqlState: error.sqlState
    })
  }
}

// GET ALL KEGIATAN (ADMIN)
exports.getAllKegiatanAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        k.id,
        k.judul,
        k.deskripsi,
        k.jenis_kegiatan_id,
        jk.jenis_kegiatan,
        k.tanggal,
        k.lokasi,
        l.nama_lokasi,
        k.user_id,
        u.full_name AS nama_admin,
        k.jam_mulai,
        k.jam_selesai,
        k.status
      FROM kegiatan k
      LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
      LEFT JOIN lokasi l ON l.id = k.lokasi
      LEFT JOIN users u ON u.id = k.user_id
      ORDER BY k.tanggal DESC
    `)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// UPDATE KEGIATAN (ADMIN)
exports.updateKegiatan = async (req, res) => {
  try {
    const { id } = req.params
    const {
      judul,
      deskripsi,
      jenis_kegiatan_id,
      lokasi_id,
      tanggal,
      jam_mulai,
      jam_selesai
    } = req.body

    if (!id) {
      return res.status(400).json({ message: 'ID tidak ditemukan' })
    }

    const [result] = await db.query(
      `UPDATE kegiatan SET
        judul = ?,
        deskripsi = ?,
        jenis_kegiatan_id = ?,
        lokasi = ?,
        tanggal = ?,
        jam_mulai = ?,
        jam_selesai = ?
      WHERE id = ?`,
      [
        judul,
        deskripsi,
        jenis_kegiatan_id,
        lokasi_id,
        tanggal,
        jam_mulai,
        jam_selesai,
        id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Kegiatan tidak ditemukan'
      })
    }

    res.json({ message: 'Kegiatan berhasil diperbarui' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

// GET ALL KEGIATAN BY LOKASI
exports.getAllKegiatanByLokasi = async (req, res) => {
  const { lokasiId } = req.params

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
    )

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
    }))

    res.json(formattedRows)
  } catch (err) {
    console.error('Error getAllKegiatanByLokasi:', err)
    res.status(500).json({ 
      message: 'Gagal mengambil semua kegiatan', 
      error: err.message 
    })
  }
}

// GET KEGIATAN AKAN DATANG BY LOKASI
exports.getAkanDatangByLokasi = async (req, res) => {
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
        AND (k.tanggal >= CURDATE())
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

    res.json(formattedRows)
  } catch (err) {
    console.error('Error getAkanDatangByLokasi:', err)
    res.status(500).json({ 
      message: 'Gagal mengambil kegiatan akan datang', 
      error: err.message 
    })
  }
}

/* =====================================================
   ===================== LOKASI =========================
   ===================================================== */

// GET ALL LOKASI
exports.getAllLokasi = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM lokasi ORDER BY nama_lokasi ASC'
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/* =====================================================
   ===================== LAPORAN ========================
   ===================================================== */

// CREATE LAPORAN
exports.createLaporan = async (req, res) => {
  try {
    const { kegiatan_id, judul_laporan, detail_kegiatan, nama_file } = req.body

    if (!kegiatan_id || !judul_laporan || !detail_kegiatan) {
      return res.status(400).json({ message: 'Data wajib belum lengkap' })
    }

    const img = req.file ? req.file.buffer : null
    const file_name = req.file ? req.file.originalname : nama_file || null

    await db.query(`
      INSERT INTO laporan
      (kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img)
      VALUES (?, ?, ?, ?, ?)
    `, [kegiatan_id, file_name, judul_laporan, detail_kegiatan, img])

    res.status(201).json({ message: 'Laporan berhasil ditambahkan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah laporan' })
  }
}

// GET ALL LAPORAN (ADMIN)
exports.getAllLaporan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        lp.id AS laporan_id,
        lp.judul_laporan,
        lp.detail_kegiatan,
        lp.tanggal AS tanggal_laporan,
        lp.nama_file,
        lp.img,
        k.id AS kegiatan_id,
        k.judul AS judul_kegiatan,
        k.tanggal AS tanggal_kegiatan,
        k.jam_mulai,
        k.jam_selesai,
        l.nama_lokasi
      FROM laporan lp
      JOIN kegiatan k ON lp.kegiatan_id = k.id
      LEFT JOIN lokasi l ON k.lokasi = l.id
      ORDER BY lp.tanggal DESC
    `)

    const formatted = rows.map(r => ({
      laporan_id: r.laporan_id,
      judul_laporan: r.judul_laporan,
      detail_kegiatan: r.detail_kegiatan,
      tanggal_laporan: r.tanggal_laporan,
      nama_file: r.nama_file,
      img_base64: r.img ? Buffer.from(r.img).toString('base64') : null,
      kegiatan: {
        id: r.kegiatan_id,
        judul: r.judul_kegiatan,
        tanggal: r.tanggal_kegiatan,
        jam_mulai: r.jam_mulai,
        jam_selesai: r.jam_selesai,
        lokasi: r.nama_lokasi
      }
    }))

    res.json(formatted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil laporan' })
  }
}

// GET LAPORAN SELESAI BY LOKASI
exports.getSelesaiByLokasi = async (req, res) => {
  const { lokasiId } = req.params

  try {
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
    )

    if (!rows || rows.length === 0) {
      return res.json([])
    }

    const formattedRows = rows.map(row => {
      let imgBase64 = null
      if (row.img && row.img.length > 0) {
        try {
          imgBase64 = Buffer.from(row.img).toString('base64')
        } catch (imgErr) {
          console.error('Error converting image to base64:', imgErr)
          imgBase64 = null
        }
      }

      return {
        id_laporan: row.id_laporan,
        judul_laporan: row.judul_laporan || 'Laporan Kegiatan',
        nama_file: row.nama_file || '',
        detail_kegiatan: row.detail_kegiatan || '',
        tanggal_laporan: row.tanggal_laporan || '',
        img: imgBase64,
        kegiatan: {
          judul: row.judul_kegiatan || 'Kegiatan',
          deskripsi: row.deskripsi_kegiatan || '',
          jenis_kegiatan: `Jenis ID: ${row.jenis_kegiatan_id}`,
          tanggal: row.tanggal_kegiatan ? new Date(row.tanggal_kegiatan).toISOString().split('T')[0] : '',
          jam_mulai: row.jam_mulai || '',
          jam_selesai: row.jam_selesai || '',
          full_name: row.full_name || 'User ID belum tersedia'
        }
      }
    })

    res.json(formattedRows)
  } catch (err) {
    console.error('Error getSelesaiByLokasi:', err)
    res.status(500).json({ 
      message: 'Gagal mengambil laporan selesai', 
      error: err.message
    })
  }
}

// UPDATE LAPORAN
exports.updateLaporan = async (req, res) => {
  try {
    const { id } = req.params
    const { judul_laporan, detail_kegiatan } = req.body

    if (!judul_laporan || !detail_kegiatan) {
      return res.status(400).json({
        message: 'Judul dan detail kegiatan wajib diisi'
      })
    }

    const [oldRows] = await db.query(
      'SELECT img, nama_file FROM laporan WHERE id = ?',
      [id]
    )

    if (oldRows.length === 0) {
      return res.status(404).json({
        message: 'Laporan tidak ditemukan'
      })
    }

    const img = req.file ? req.file.buffer : oldRows[0].img
    const nama_file = req.file
      ? req.file.originalname
      : oldRows[0].nama_file

    const [result] = await db.query(
      `UPDATE laporan SET
        judul_laporan = ?,
        detail_kegiatan = ?,
        img = ?,
        nama_file = ?
      WHERE id = ?`,
      [judul_laporan, detail_kegiatan, img, nama_file, id]
    )

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: 'Data tidak berubah'
      })
    }

    res.json({ message: 'Laporan berhasil diperbarui' })
  } catch (error) {
    console.error('updateLaporan:', error)
    res.status(500).json({
      message: 'Gagal memperbarui laporan',
      error: error.message
    })
  }
}

// DELETE LAPORAN
exports.deleteLaporan = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'DELETE FROM laporan WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' })
    }

    res.json({ message: 'Laporan berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus laporan' })
  }
}

// GET CETAK LAPORAN DATA
exports.getCetakLaporanData = async (req, res) => {
  try {
    const { kegiatan_id } = req.params

    const [rows] = await db.query(
      `
      SELECT
        k.judul,
        k.tanggal,
        l.nama_lokasi AS lokasi,
        lp.judul_laporan,
        lp.detail_kegiatan,
        lp.nama_file
      FROM kegiatan k
      JOIN laporan lp ON k.id = lp.kegiatan_id
      LEFT JOIN lokasi l ON k.lokasi = l.id
      WHERE k.id = ?
      `,
      [kegiatan_id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data laporan tidak ditemukan' })
    }

    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/* =====================================================
   ==================== REVIEW ==========================
   ===================================================== */

// GET REVIEWS BY LAPORAN
// Di adminController.js - fungsi getReviewsByLaporan
exports.getReviewsByLaporan = async (req, res) => {
  const { laporanId } = req.params;

  try {
    const [reviews] = await db.query(
      `SELECT 
        kr.id,
        kr.laporan_id,
        kr.user_id,
        kr.pesan,
        kr.rating,
        kr.tanggal,  // PERUBAHAN: tambahkan tanggal
        u.full_name,
        u.email
      FROM kegiatan_review kr
      JOIN users u ON kr.user_id = u.id
      WHERE kr.laporan_id = ?
      ORDER BY kr.tanggal DESC`,  // PERUBAHAN: dari kr.tanggal ke kr.tanggal
      [laporanId]
    );

    const [ratingStats] = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM kegiatan_review 
      WHERE laporan_id = ?`,
      [laporanId]
    );

    res.json({
      reviews,
      stats: ratingStats[0] || { total_reviews: 0, average_rating: 0 }
    });
  } catch (err) {
    console.error('Error getReviewsByLaporan:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil review', 
      error: err.message 
    });
  }
};
// ADD REVIEW
exports.addReview = async (req, res) => {
  const { laporanId } = req.params
  const { pesan, rating } = req.body
  const userId = req.user.id

  try {
    if (!pesan || pesan.trim().length === 0) {
      return res.status(400).json({ message: 'Pesan review wajib diisi' })
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating harus antara 1-5' })
    }

    const [existingReview] = await db.query(
      'SELECT id FROM kegiatan_review WHERE laporan_id = ? AND user_id = ?',
      [laporanId, userId]
    )

    if (existingReview.length > 0) {
      return res.status(409).json({ 
        message: 'Anda sudah memberikan review untuk laporan ini',
        review_id: existingReview[0].id
      })
    }

    const [laporanExist] = await db.query(
      'SELECT id FROM laporan WHERE id = ?',
      [laporanId]
    )

    if (laporanExist.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' })
    }

    const [result] = await db.query(
      `INSERT INTO kegiatan_review (laporan_id, user_id, pesan, rating) 
       VALUES (?, ?, ?, ?)`,
      [laporanId, userId, pesan.trim(), rating || null]
    )

    res.status(201).json({
      message: 'Review berhasil ditambahkan',
      review_id: result.insertId
    })
  } catch (err) {
    console.error('Error addReview:', err)
    res.status(500).json({ 
      message: 'Gagal menambahkan review', 
      error: err.message 
    })
  }
}

// UPDATE REVIEW
exports.updateReview = async (req, res) => {
  const { reviewId } = req.params
  const { pesan, rating } = req.body
  const userId = req.user.id

  try {
    if (!pesan || pesan.trim().length === 0) {
      return res.status(400).json({ message: 'Pesan review wajib diisi' })
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating harus antara 1-5' })
    }

    const [review] = await db.query(
      'SELECT * FROM kegiatan_review WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    )

    if (review.length === 0) {
      return res.status(404).json({ 
        message: 'Review tidak ditemukan atau Anda tidak memiliki akses' 
      })
    }

    await db.query(
      `UPDATE kegiatan_review 
       SET pesan = ?, rating = ?, tanggal = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [pesan.trim(), rating || null, reviewId]
    )

    res.json({
      message: 'Review berhasil diperbarui'
    })
  } catch (err) {
    console.error('Error updateReview:', err)
    res.status(500).json({ 
      message: 'Gagal memperbarui review', 
      error: err.message 
    })
  }
}

// DELETE REVIEW
exports.deleteReview = async (req, res) => {
  const { reviewId } = req.params
  const userId = req.user.id

  try {
    const [review] = await db.query(
      'SELECT id FROM kegiatan_review WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    )

    if (review.length === 0) {
      return res.status(404).json({ 
        message: 'Review tidak ditemukan atau Anda tidak memiliki akses' 
      })
    }

    await db.query(
      'DELETE FROM kegiatan_review WHERE id = ?',
      [reviewId]
    )

    res.json({
      message: 'Review berhasil dihapus'
    })
  } catch (err) {
    console.error('Error deleteReview:', err)
    res.status(500).json({ 
      message: 'Gagal menghapus review', 
      error: err.message 
    })
  }
}

/* =====================================================
   ================= RIWAYAT PASIEN =====================
   ===================================================== */

// GET RIWAYAT PASIEN
exports.getRiwayatPasien = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT rp.*, u.full_name as nama_dokter 
      FROM riwayat_pasien rp
      LEFT JOIN users u ON rp.dokter_id = u.id
      ORDER BY rp.tanggal DESC
    `)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ADD RIWAYAT PASIEN
exports.addRiwayatPasien = async (req, res) => {
  const { pasien_nama, dokter_id, diagnosis, tindakan, tanggal } = req.body
  try {
    await db.query(
      'INSERT INTO riwayat_pasien (pasien_nama, dokter_id, diagnosis, tindakan, tanggal) VALUES (?, ?, ?, ?, ?)',
      [pasien_nama, dokter_id, diagnosis, tindakan, tanggal]
    )
    res.status(201).json({ message: 'Riwayat pasien berhasil ditambahkan' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
// ADMIN: ADD LOKASI
exports.addLokasi = async (req, res) => {
  try {
    const { nama_lokasi, latitude, longitude, is_puskesmas } = req.body

    if (!nama_lokasi) {
      return res.status(400).json({ message: 'Nama lokasi wajib diisi' })
    }

    await db.query(
      `INSERT INTO lokasi (nama_lokasi, latitude, longitude, is_puskesmas)
       VALUES (?, ?, ?, ?)`,
      [
        nama_lokasi,
        latitude || null,
        longitude || null,
        is_puskesmas ? 1 : 0
      ]
    )

    res.status(201).json({ message: 'Lokasi berhasil ditambahkan' })
  } catch (err) {
    console.error('addLokasi:', err)
    res.status(500).json({ message: 'Gagal menambahkan lokasi' })
  }
}
// ADMIN: UPDATE LOKASI
exports.updateLokasi = async (req, res) => {
  try {
    const { id } = req.params
    const { nama_lokasi, latitude, longitude, is_puskesmas } = req.body

    if (!nama_lokasi) {
      return res.status(400).json({ message: 'Nama lokasi wajib diisi' })
    }

    const [result] = await db.query(
      `UPDATE lokasi SET
        nama_lokasi = ?,
        latitude = ?,
        longitude = ?,
        is_puskesmas = ?
       WHERE id = ?`,
      [
        nama_lokasi,
        latitude || null,
        longitude || null,
        is_puskesmas ? 1 : 0,
        id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lokasi tidak ditemukan' })
    }

    res.json({ message: 'Lokasi berhasil diperbarui' })
  } catch (err) {
    console.error('updateLokasi:', err)
    res.status(500).json({ message: 'Gagal memperbarui lokasi' })
  }
}
// ADMIN: DELETE LOKASI
exports.deleteLokasi = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'DELETE FROM lokasi WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lokasi tidak ditemukan' })
    }

    res.json({ message: 'Lokasi berhasil dihapus' })
  } catch (err) {
    console.error('deleteLokasi:', err)
    res.status(500).json({ message: 'Gagal menghapus lokasi' })
  }
}
// ===================== POLI (ADMIN) =====================

// ADD POLI
// ADMIN: ADD POLI
exports.addPoli = async (req, res) => {
  try {
    const { nama_poli, deskripsi, icon, color } = req.body

    if (!nama_poli || !icon || !color) {
      return res.status(400).json({ message: 'Data wajib belum lengkap' })
    }

    await db.query(
      `INSERT INTO poli (nama_poli, deskripsi, icon, color)
       VALUES (?, ?, ?, ?)`,
      [nama_poli, deskripsi || null, icon, color]
    )

    res.status(201).json({ message: 'Poli berhasil ditambahkan' })
  } catch (err) {
    console.error('addPoli:', err)
    res.status(500).json({ message: 'Gagal menambahkan poli' })
  }
}

// ADMIN: UPDATE POLI
exports.updatePoli = async (req, res) => {
  try {
    const { id } = req.params
    const { nama_poli, deskripsi, icon, color } = req.body

    const [result] = await db.query(
      `UPDATE poli SET
        nama_poli = ?,
        deskripsi = ?,
        icon = ?,
        color = ?
       WHERE id = ?`,
      [nama_poli, deskripsi || null, icon, color, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Poli tidak ditemukan' })
    }

    res.json({ message: 'Poli berhasil diperbarui' })
  } catch (err) {
    console.error('updatePoli:', err)
    res.status(500).json({ message: 'Gagal update poli' })
  }
}

// ADMIN: DELETE POLI
exports.deletePoli = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'DELETE FROM poli WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Poli tidak ditemukan' })
    }

    res.json({ message: 'Poli berhasil dihapus' })
  } catch (err) {
    console.error('deletePoli:', err)
    res.status(500).json({ message: 'Gagal menghapus poli' })
  }
}