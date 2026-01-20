const db = require('../config/db');

exports.updateStatusKehadiran = async (req, res) => {
  const { status, keterangan, jam_masuk, jam_keluar } = req.body;
  const userId = req.user.id; // ini USER ID

  try {
    // ambil dokter.id berdasarkan user_id
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?',
      [userId]
    );

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Data dokter tidak ditemukan' });
    }

    const dokterId = dokterRows[0].id; // ← INI dokter.id

    await db.query(
      'INSERT INTO dokter_status (dokter_id, status, keterangan, jam_masuk, jam_keluar) VALUES (?, ?, ?, ?, ?)',
      [dokterId, status, keterangan, jam_masuk, jam_keluar]
    );

    res.json({ message: 'Status kehadiran berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getMyStatusHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    // ambil dokter.id dari user_id
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?',
      [userId]
    );

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Data dokter tidak ditemukan' });
    }

    const dokterId = dokterRows[0].id;

    const [rows] = await db.query(
      'SELECT * FROM dokter_status WHERE dokter_id = ? ORDER BY id DESC',
      [dokterId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDokterByPoli = async (req, res) => {
  const { poliId } = req.params

  try {
    const [rows] = await db.query(`
    SELECT 
        d.id,
        d.nama,
        d.spesialis
    FROM dokter d
    WHERE d.poli_id = ?
    ORDER BY d.nama ASC
    `, [poliId])


    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil data dokter' })
  }
}


