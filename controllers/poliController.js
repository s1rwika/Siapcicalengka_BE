const db = require('../config/db')

exports.getAllPoli = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        nama_poli AS name,
        deskripsi AS description,
        icon,
        color
      FROM poli
      ORDER BY id ASC
    `)

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil data poli' })
  }
}
