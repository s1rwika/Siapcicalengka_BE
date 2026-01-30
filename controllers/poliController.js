const db = require('../config/db')

exports.getAllPoli = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        nama_poli,
        deskripsi,
        icon
      FROM poli
      ORDER BY nama_poli ASC
    `)

    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

