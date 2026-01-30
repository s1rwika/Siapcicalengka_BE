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

// ================= GET STATISTIK PENYAKIT =================
exports.getStatistikPenyakit = async (req, res) => {
  const { lokasi_id, penyakit, start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT 
        penyakit,
        COUNT(*) as jumlah,
        lokasi_id,
        l.nama_lokasi
      FROM riwayat_penyakit rp
      LEFT JOIN lokasi l ON rp.lokasi_id = l.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filter berdasarkan lokasi
    if (lokasi_id && lokasi_id !== 'all') {
      sql += ' AND rp.lokasi_id = ?';
      params.push(lokasi_id);
    }

    // Filter berdasarkan penyakit
    if (penyakit && penyakit !== 'all') {
      sql += ' AND rp.penyakit LIKE ?';
      params.push(`%${penyakit}%`);
    }

    // Filter berdasarkan tanggal
    if (start_date) {
      sql += ' AND rp.tanggal >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND rp.tanggal <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY penyakit, lokasi_id ORDER BY jumlah DESC';

    const [rows] = await db.query(sql, params);

    // Hitung total untuk persentase
    const total = rows.reduce((sum, item) => sum + item.jumlah, 0);

    // Format data untuk chart
    const chartData = rows.map(item => ({
      penyakit: item.penyakit,
      jumlah: item.jumlah,
      lokasi: item.nama_lokasi || 'Tidak diketahui',
      persentase: total > 0 ? ((item.jumlah / total) * 100).toFixed(1) : 0
    }));

    // Get unique penyakit untuk dropdown
    const [uniquePenyakit] = await db.query(`
      SELECT DISTINCT penyakit 
      FROM riwayat_penyakit 
      WHERE penyakit IS NOT NULL AND penyakit != ''
      ORDER BY penyakit
    `);

    res.json({
      success: true,
      data: {
        chartData,
        totalKasus: total,
        summary: rows,
        penyakitOptions: uniquePenyakit.map(p => p.penyakit)
      }
    });

  } catch (err) {
    console.error('Error getStatistikPenyakit:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil statistik penyakit',
      error: err.message 
    });
  }
};

// ================= GET DISTRIBUSI LOKASI =================
exports.getDistribusiLokasi = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        l.nama_lokasi,
        COUNT(rp.id) as jumlah_kasus,
        GROUP_CONCAT(DISTINCT rp.penyakit) as penyakit_list
      FROM lokasi l
      LEFT JOIN riwayat_penyakit rp ON l.id = rp.lokasi_id
      GROUP BY l.id, l.nama_lokasi
      ORDER BY jumlah_kasus DESC
    `);

    const total = rows.reduce((sum, item) => sum + item.jumlah_kasus, 0);

    const data = rows.map(item => ({
      lokasi: item.nama_lokasi,
      jumlah: item.jumlah_kasus,
      penyakit: item.penyakit_list ? item.penyakit_list.split(',').slice(0, 3).join(', ') : 'Tidak ada data',
      persentase: total > 0 ? ((item.jumlah_kasus / total) * 100).toFixed(1) : 0
    }));

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error('Error getDistribusiLokasi:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil distribusi lokasi',
      error: err.message 
    });
  }
};