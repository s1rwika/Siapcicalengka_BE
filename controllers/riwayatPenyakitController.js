const db = require('../config/db')

// ================= GET ALL =================
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT rp.*, l.nama_lokasi
      FROM riwayat_penyakit rp
      LEFT JOIN lokasi l ON rp.lokasi_id = l.id
      ORDER BY rp.tanggal DESC
    `)

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
}

// ================= CREATE =================
exports.create = async (req, res) => {
  const { pasien_nama, penyakit, lokasi_id, alamat, tanggal } = req.body

  if (!pasien_nama || !penyakit || !lokasi_id || !alamat || !tanggal) {
    return res.status(400).json({ message: 'Data tidak lengkap' })
  }

  try {
    await db.query(
      `INSERT INTO riwayat_penyakit
       (pasien_nama, penyakit, lokasi_id, alamat, tanggal)
       VALUES (?, ?, ?, ?, ?)`,
      [pasien_nama, penyakit, lokasi_id, alamat, tanggal]
    )

    res.status(201).json({ message: 'Data berhasil disimpan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan data' })
  }
}

// ================= UPDATE =================
exports.update = async (req, res) => {
  const { id } = req.params
  const { pasien_nama, penyakit, lokasi_id, alamat, tanggal } = req.body

  try {
    const [result] = await db.query(
      `UPDATE riwayat_penyakit
       SET pasien_nama=?, penyakit=?, lokasi_id=?, alamat=?, tanggal=?
       WHERE id=?`,
      [pasien_nama, penyakit, lokasi_id, alamat, tanggal, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' })
    }

    res.json({ message: 'Data berhasil diperbarui' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal update data' })
  }
}

// ================= DELETE =================
exports.remove = async (req, res) => {
  const { id } = req.params

  try {
    await db.query('DELETE FROM riwayat_penyakit WHERE id=?', [id])
    res.json({ message: 'Data berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus data' })
  }
}
