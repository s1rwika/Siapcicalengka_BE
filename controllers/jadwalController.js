const db = require('../config/db')

exports.getJadwalByPoli = async (req, res) => {
  const { poliId } = req.params

  try {
    const [rows] = await db.query(`
      SELECT
        j.id,
        d.nama,
        d.spesialis,
        j.hari,
        j.jam_mulai,
        j.jam_selesai
      FROM jadwal_dokter j
      JOIN dokter d ON d.id = j.dokter_id
      WHERE j.poli_id = ?
        AND j.status = 'aktif'
      ORDER BY 
        FIELD(j.hari,'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'),
        j.jam_mulai
    `, [poliId])

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil jadwal dokter' })
  }
}
