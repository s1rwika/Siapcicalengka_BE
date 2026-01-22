const db = require('../config/db');

exports.addReview = async (req, res) => {
    const { id } = req.params; // ID Kegiatan
    const { pesan, rating } = req.body;
    const userId = req.user.id;

    try {
        // Cek apakah kegiatan ada dan statusnya disetujui (opsional)
        const [cekKegiatan] = await db.query('SELECT * FROM kegiatan WHERE id = ?', [id]);
        if (cekKegiatan.length === 0) return res.status(404).json({ message: 'Kegiatan tidak valid' });

        await db.query(
            'INSERT INTO kegiatan_review (kegiatan_id, user_id, pesan, rating) VALUES (?, ?, ?, ?)',
            [id, userId, pesan, rating]
        );

        res.status(201).json({ message: 'Review berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// GET USERS BY ROLE (ADMIN)
exports.getUsersByRole = async (req, res) => {
  const { role } = req.query

  try {
    let sql = 'SELECT id, full_name AS name FROM users'
    let params = []

    if (role) {
      sql += ' WHERE role = ?'
      params.push(role)
    }

    const [rows] = await db.query(sql, params)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
