const db = require('../config/db')

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
    lokasi,
    user_id,
    jam_mulai,
    jam_selesai
  } = req.body

  if (!id) {
    return res.status(400).json({ message: 'ID kegiatan wajib diisi' })
  }

  try {
    await db.query(`
      INSERT INTO kegiatan
      (id, judul, deskripsi, jenis_kegiatan_id, tanggal, lokasi, user_id, jam_mulai, jam_selesai, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')
    `, [
      id,
      judul,
      deskripsi,
      jenis_kegiatan_id,
      tanggal,
      lokasi,
      user_id,
      jam_mulai,
      jam_selesai
    ])

    res.status(201).json({ message: 'Kegiatan berhasil ditambahkan' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'ID kegiatan sudah digunakan' })
    }
    res.status(500).json({ error: err.message })
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
        k.tanggal,
        k.lokasi,
        l.nama_lokasi,
        k.user_id,
        u.full_name AS nama_admin,
        k.jam_mulai,
        k.jam_selesai,
        k.status
      FROM kegiatan k
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

    if (!id) {
      return res.status(400).json({ message: 'ID tidak ditemukan' })
    }

    const {
      judul,
      deskripsi,
      jenis_kegiatan_id,
      tanggal,
      lokasi,
      user_id,
      jam_mulai,
      jam_selesai
    } = req.body

    const [result] = await db.query(
      `
      UPDATE kegiatan SET
        judul = ?,
        deskripsi = ?,
        jenis_kegiatan_id = ?,
        tanggal = ?,
        lokasi = ?,
        user_id = ?,
        jam_mulai = ?,
        jam_selesai = ?
      WHERE id = ?
      `,
      [
        judul,
        deskripsi,
        jenis_kegiatan_id,
        tanggal,
        lokasi,
        user_id,
        jam_mulai,
        jam_selesai,
        id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Data tidak berubah atau ID tidak ditemukan'
      })
    }

    res.json({ message: 'Kegiatan berhasil diperbarui' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message })
  }
}

/* =====================================================
   ===================== LOKASI =========================
   ===================================================== */

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

/* ===============================
   GET ALL LAPORAN (ADMIN)
================================ */
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
      img: r.img ? Buffer.from(r.img).toString('base64') : null,

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

/* ===============================
   CREATE LAPORAN
================================ */
exports.createLaporan = async (req, res) => {
  try {
    const { kegiatan_id, judul_laporan, detail_kegiatan } = req.body

    if (!kegiatan_id || !judul_laporan || !detail_kegiatan) {
      return res.status(400).json({ message: 'Data wajib belum lengkap' })
    }

    const img = req.file ? req.file.buffer : null
    const nama_file = req.file ? req.file.originalname : null

    await db.query(`
      INSERT INTO laporan
      (kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img)
      VALUES (?, ?, ?, ?, ?)
    `, [kegiatan_id, nama_file, judul_laporan, detail_kegiatan, img])

    res.status(201).json({ message: 'Laporan berhasil ditambahkan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah laporan' })
  }
}

/* ===============================
   UPDATE LAPORAN
================================ */
exports.updateLaporan = async (req, res) => {
  try {
    const { id } = req.params
    const { judul_laporan, detail_kegiatan } = req.body

    if (!judul_laporan || !detail_kegiatan) {
      return res.status(400).json({
        message: 'Judul dan detail kegiatan wajib diisi'
      })
    }

    // Ambil laporan lama (untuk gambar lama)
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
      `
      UPDATE laporan SET
        judul_laporan = ?,
        detail_kegiatan = ?,
        img = ?,
        nama_file = ?
      WHERE id = ?
      `,
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

/* ===============================
   DELETE LAPORAN
================================ */
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