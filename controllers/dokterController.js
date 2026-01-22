const db = require('../config/db');

/* =====================================================
   ===================== DOKTER ========================
   ===================================================== */

// Dokter update status hadir
exports.updateStatusKehadiran = async (req, res) => {
  const { status, keterangan, jam_masuk, jam_keluar } = req.body;
  const userId = req.user.id;

  try {
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?',
      [userId]
    );

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Data dokter tidak ditemukan' });
    }

    const dokterId = dokterRows[0].id;

    await db.query(
      `INSERT INTO dokter_status 
       (dokter_id, status, keterangan, jam_masuk, jam_keluar)
       VALUES (?, ?, ?, ?, ?)`,
      [dokterId, status, keterangan, jam_masuk, jam_keluar]
    );

    res.json({ message: 'Status kehadiran berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Dokter lihat histori status sendiri
exports.getMyStatusHistory = async (req, res) => {
  const userId = req.user.id;

  try {
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

/* =====================================================
   ===================== PUBLIC ========================
   ===================================================== */

// Guest lihat dokter per poli
exports.getDokterByPoli = async (req, res) => {
  const { poliId } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.nama,
        d.spesialis
      FROM dokter d
      WHERE d.poli_id = ?
      ORDER BY d.nama ASC
    `, [poliId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data dokter' });
  }
};

/* =====================================================
   ===================== ADMIN =========================
   ===================================================== */

// ADMIN - lihat semua dokter
exports.getUserDokter = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name
      FROM users u
      WHERE u.role = 'dokter'
      AND u.id NOT IN (
        SELECT user_id FROM dokter
      )
      ORDER BY u.full_name ASC
    `)

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil user dokter' })
  }
}

// ===============================
// ADMIN: GET ALL DOKTER
// ===============================
exports.getAllDokterAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.user_id,
        d.nama,
        d.spesialis,
        d.no_telepon,
        d.email,
        d.poli_id,
        p.nama_poli
      FROM dokter d
      LEFT JOIN poli p ON p.id = d.poli_id
      ORDER BY d.nama ASC
    `)

    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data dokter' })
  }
}

// ===============================
// ADMIN: TAMBAH DOKTER
// ===============================
exports.addDokterAdmin = async (req, res) => {
  const { user_id, nama, spesialis, no_telepon, email, poli_id } = req.body

  try {
    await db.query(`
      INSERT INTO dokter
      (user_id, nama, spesialis, no_telepon, email, poli_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user_id, nama, spesialis, no_telepon, email, poli_id])

    res.json({ message: 'Dokter berhasil ditambahkan' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal menambahkan dokter' })
  }
}

// ADMIN - update data dokter (MASTER)
exports.updateDokterAdmin = async (req, res) => {
  const { id } = req.params;
  const { nama, spesialis, no_telepon, email, poli_id } = req.body;

  try {
    await db.query(
      `UPDATE dokter
       SET
         nama = ?,
         spesialis = ?,
         no_telepon = ?,
         email = ?,
         poli_id = ?
       WHERE id = ?`,
      [nama, spesialis, no_telepon, email, poli_id, id]
    );

    res.json({ message: 'Data dokter berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal update dokter' });
  }
};

// ADMIN - lihat jadwal dokter
exports.getJadwalDokterAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT *
       FROM jadwal_dokter
       WHERE dokter_id = ?
       ORDER BY FIELD(hari,'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')`,
      [id]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil jadwal dokter' });
  }
};

// ADMIN - tambah jadwal dokter
exports.addJadwalDokterAdmin = async (req, res) => {
  const { dokter_id, poli_id, hari, jam_mulai, jam_selesai } = req.body;

  try {
    await db.query(
      `INSERT INTO jadwal_dokter
       (dokter_id, poli_id, hari, jam_mulai, jam_selesai, status)
       VALUES (?, ?, ?, ?, ?, 'nonaktif')`,
      [dokter_id, poli_id, hari, jam_mulai, jam_selesai]
    );

    res.json({ message: 'Jadwal dokter berhasil ditambahkan (nonaktif)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan jadwal dokter' });
  }
};

// ADMIN - update jadwal dokter
exports.updateJadwalDokterAdmin = async (req, res) => {
  const { id } = req.params;
  const { hari, jam_mulai, jam_selesai, status } = req.body;

  try {
    await db.query(
      `UPDATE jadwal_dokter
       SET
         hari = ?,
         jam_mulai = ?,
         jam_selesai = ?,
         status = ?
       WHERE id = ?`,
      [hari, jam_mulai, jam_selesai, status, id]
    );

    res.json({ message: 'Jadwal dokter berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal update jadwal dokter' });
  }
};
