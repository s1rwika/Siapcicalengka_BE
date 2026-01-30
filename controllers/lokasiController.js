const db = require('../config/db');

// ===============================
// GET semua lokasi
// ===============================
exports.getAllLokasi = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        nama_lokasi,
        latitude,
        longitude,
        is_puskesmas,
        created_at
      FROM lokasi
      ORDER BY nama_lokasi ASC
    `;

    const [results] = await db.query(query);

    res.json(results);
  } catch (err) {
    console.error('Error ambil lokasi:', err);
    res.status(500).json({ message: 'Gagal mengambil data lokasi' });
  }
};

// ===============================
// TAMBAH lokasi
// ===============================
exports.addLokasi = async (req, res) => {
  try {
    const { nama_lokasi, latitude, longitude, is_puskesmas } = req.body;

    if (!nama_lokasi || !latitude || !longitude) {
      return res.status(400).json({
        message: 'nama_lokasi, latitude, dan longitude wajib diisi'
      });
    }

    const query = `
      INSERT INTO lokasi
      (nama_lokasi, latitude, longitude, is_puskesmas)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      nama_lokasi,
      latitude,
      longitude,
      is_puskesmas ? 1 : 0
    ]);

    res.status(201).json({
      message: 'Lokasi berhasil ditambahkan',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error tambah lokasi:', err);
    res.status(500).json({ message: 'Gagal menambahkan lokasi' });
  }
};
