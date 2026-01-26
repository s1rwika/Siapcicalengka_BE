const db = require('../config/db')

/**
 * Helper: Mendapatkan nama hari dalam Bahasa Indonesia
 */
const getIndonesianDay = () => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[new Date().getDay()]
}

/**
 * Helper: Mendapatkan waktu format HH:mm:ss
 */
const getMySQLTime = () => {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/* =====================================================
   ===================== DOKTER ========================
   ===================================================== */

// DOKTER: Ambil semua jadwal sendiri
exports.getMySchedule = async (req, res) => {
  const userId = req.user.id

  try {
    const [rows] = await db.query(`
      SELECT 
        jd.hari, 
        jd.jam_mulai, 
        jd.jam_selesai, 
        p.nama_poli, 
        jd.status
      FROM jadwal_dokter jd
      JOIN dokter d ON jd.dokter_id = d.id
      JOIN poli p ON d.poli_id = p.id
      WHERE d.user_id = ?
      ORDER BY 
        FIELD(jd.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), 
        jd.jam_mulai ASC
    `, [userId])

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

// --- B. CEK STATUS SAAT INI & AUTO-OFF ---
// Fungsi ini dipanggil saat dokter membuka dashboard (untuk sinkronisasi status)
exports.getMyCurrentStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?', 
      [userId]
    )

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Dokter tidak ditemukan' })
    }

    const dokterId = dokterRows[0].id
    const hariIni = getIndonesianDay()
    const jamSekarang = getMySQLTime()

    // Ambil jadwal khusus hari ini
    const [rows] = await db.query(
      `SELECT 
        id, 
        status, 
        jam_mulai, 
        jam_selesai 
      FROM jadwal_dokter 
      WHERE dokter_id = ? AND hari = ?`,
      [dokterId, hariIni]
    )

    if (rows.length === 0) {
      return res.json({ 
        status: 'Libur', 
        message: 'Tidak ada jadwal hari ini.' 
      })
    }

    let activeNow = null
    let nextStart = null

    for (let j of rows) {
      // LOGIKA AUTO-OFF: Jika jam selesai sudah lewat tapi status masih 'aktif', ubah ke 'nonaktif'
      if (jamSekarang > j.jam_selesai && j.status === 'aktif') {
        await db.query(
          'UPDATE jadwal_dokter SET status = "nonaktif" WHERE id = ?', 
          [j.id]
        )
        j.status = 'nonaktif'
      }

      // Cek apakah sekarang masuk dalam rentang jam praktek
      if (jamSekarang >= j.jam_mulai && jamSekarang <= j.jam_selesai) {
        activeNow = j
      }
      
      // Cek jadwal terdekat berikutnya
      if (jamSekarang < j.jam_mulai && (!nextStart || j.jam_mulai < nextStart)) {
        nextStart = j.jam_mulai
      }
    }

    if (activeNow) {
      return res.json({ 
        status: activeNow.status, 
        jam_mulai: activeNow.jam_mulai, 
        jam_selesai: activeNow.jam_selesai 
      })
    }

    if (nextStart) {
      return res.json({ 
        status: 'Belum Waktunya', 
        message: `Mulai jam ${nextStart.substring(0, 5)}` 
      })
    }

    res.json({ 
      status: 'Selesai', 
      message: 'Jadwal hari ini sudah berakhir.' 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

// DOKTER: Update status manual (aktif/nonaktif)
exports.updateStatusKehadiran = async (req, res) => {
  const userId = req.user.id
  const { status } = req.body // Input: 'aktif' atau 'nonaktif'

  try {
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?', 
      [userId]
    )

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Dokter tidak ditemukan' })
    }

    const dokterId = dokterRows[0].id
    const hariIni = getIndonesianDay()
    const jamSekarang = getMySQLTime()

    // Validasi: Perubahan status hanya bisa dilakukan pada jam operasional yang sedang berjalan
    const [result] = await db.query(
      `UPDATE jadwal_dokter 
       SET status = ? 
       WHERE dokter_id = ? 
         AND hari = ? 
         AND ? BETWEEN jam_mulai AND jam_selesai`,
      [status, dokterId, hariIni, jamSekarang]
    )

    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        message: 'Gagal! Anda hanya bisa mengubah status pada jam praktek yang sedang berlangsung.' 
      })
    }

    res.json({ message: `Status berhasil diubah menjadi ${status}` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

// DOKTER: Lihat histori status sendiri
exports.getMyStatusHistory = async (req, res) => {
  const userId = req.user.id

  try {
    const [dokterRows] = await db.query(
      'SELECT id FROM dokter WHERE user_id = ?', 
      [userId]
    )

    if (dokterRows.length === 0) {
      return res.status(404).json({ message: 'Data dokter tidak ditemukan' })
    }

    const dokterId = dokterRows[0].id

    const [rows] = await db.query(
      `SELECT 
        ds.*,
        jd.hari,
        jd.jam_mulai,
        jd.jam_selesai
      FROM dokter_status ds
      LEFT JOIN jadwal_dokter jd ON ds.jadwal_id = jd.id
      WHERE ds.dokter_id = ? 
      ORDER BY ds.created_at DESC`,
      [dokterId]
    )

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

/* =====================================================
   ===================== PUBLIC ========================
   ===================================================== */

// PUBLIC: Lihat dokter per poli
exports.getDokterByPoli = async (req, res) => {
  const { poliId } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.nama,
        d.spesialis,
        p.nama_poli,
        ds.status as status_hadir,
        ds.jam_masuk,
        ds.jam_keluar
      FROM dokter d
      LEFT JOIN poli p ON d.poli_id = p.id
      LEFT JOIN dokter_status ds ON d.id = ds.dokter_id 
        AND DATE(ds.created_at) = CURDATE()
      WHERE d.poli_id = ?
      ORDER BY d.nama ASC
    `, [poliId])

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil data dokter' })
  }
}

/* =====================================================
   ===================== ADMIN =========================
   ===================================================== */

// ADMIN: Lihat semua user yang belum jadi dokter
exports.getUserDokter = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name
      FROM users u
      WHERE u.role = 'dokter'
      ORDER BY u.full_name ASC
    `)

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Gagal mengambil user dokter' })
  }
}


// ADMIN: GET ALL DOKTER
exports.getAllDokterAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.user_id,
        d.nama,
        d.spesialis,
        d.poli_id,
        p.nama_poli,
        u.username,
        u.full_name as nama_user
      FROM dokter d
      LEFT JOIN poli p ON p.id = d.poli_id
      LEFT JOIN users u ON u.id = d.user_id
      ORDER BY d.nama ASC
    `)

    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ADMIN: TAMBAH DOKTER
exports.addDokterAdmin = async (req, res) => {
  const { user_id, nama, spesialis, poli_id } = req.body

  try {
    await db.query(`
      INSERT INTO dokter
      (user_id, nama, spesialis, poli_id)
      VALUES (?, ?, ?, ?)
    `, [user_id, nama, spesialis, poli_id])

    res.status(201).json({ 
      message: 'Dokter berhasil ditambahkan',
      success: true 
    })
  } catch (error) {
    console.error(error)
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'User sudah terdaftar sebagai dokter' 
      })
    }
    
    res.status(500).json({ 
      message: 'Gagal menambahkan dokter',
      error: error.message 
    })
  }
}

// ADMIN: UPDATE DATA DOKTER
exports.updateDokterAdmin = async (req, res) => {
  const { id } = req.params
  const { nama, spesialis, no_telepon, email, poli_id } = req.body

  try {
    const [result] = await db.query(
      `UPDATE dokter
       SET
         nama = ?,
         spesialis = ?,
         no_telepon = ?,
         email = ?,
         poli_id = ?
       WHERE id = ?`,
      [nama, spesialis, no_telepon, email, poli_id, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Data dokter tidak ditemukan' 
      })
    }

    res.json({ 
      message: 'Data dokter berhasil diperbarui',
      success: true 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ 
      message: 'Gagal update dokter',
      error: error.message 
    })
  }
}

// ADMIN: LIHAT JADWAL DOKTER
exports.getJadwalDokterAdmin = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await db.query(
      `SELECT 
        jd.*,
        d.nama as nama_dokter,
        p.nama_poli
       FROM jadwal_dokter jd
       JOIN dokter d ON jd.dokter_id = d.id
       LEFT JOIN poli p ON jd.poli_id = p.id
       WHERE jd.dokter_id = ?
       ORDER BY 
         FIELD(jd.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'),
         jd.jam_mulai ASC`,
      [id]
    )

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ 
      message: 'Gagal mengambil jadwal dokter',
      error: error.message 
    })
  }
}

// ADMIN: TAMBAH JADWAL DOKTER
exports.addJadwalDokterAdmin = async (req, res) => {
  const { dokter_id, poli_id, hari, jam_mulai, jam_selesai } = req.body

  try {
    await db.query(
      `INSERT INTO jadwal_dokter
       (dokter_id, poli_id, hari, jam_mulai, jam_selesai, status)
       VALUES (?, ?, ?, ?, ?, 'nonaktif')`,
      [dokter_id, poli_id, hari, jam_mulai, jam_selesai]
    )

    res.status(201).json({ 
      message: 'Jadwal dokter berhasil ditambahkan (nonaktif)',
      success: true 
    })
  } catch (error) {
    console.error(error)
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'Jadwal dengan hari dan jam yang sama sudah ada' 
      })
    }
    
    res.status(500).json({ 
      message: 'Gagal menambahkan jadwal dokter',
      error: error.message 
    })
  }
}

// ADMIN: UPDATE JADWAL DOKTER
exports.updateJadwalDokterAdmin = async (req, res) => {
  const { id } = req.params
  const { hari, jam_mulai, jam_selesai, status } = req.body

  try {
    const [result] = await db.query(
      `UPDATE jadwal_dokter
       SET
         hari = ?,
         jam_mulai = ?,
         jam_selesai = ?,
         status = ?
       WHERE id = ?`,
      [hari, jam_mulai, jam_selesai, status, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Jadwal dokter tidak ditemukan' 
      })
    }

    res.json({ 
      message: 'Jadwal dokter berhasil diperbarui',
      success: true 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ 
      message: 'Gagal update jadwal dokter',
      error: error.message 
    })
  }
}

// ADMIN: DELETE JADWAL DOKTER
exports.deleteJadwalDokterAdmin = async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await db.query(
      'DELETE FROM jadwal_dokter WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Jadwal dokter tidak ditemukan' 
      })
    }

    res.json({ 
      message: 'Jadwal dokter berhasil dihapus',
      success: true 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ 
      message: 'Gagal menghapus jadwal dokter',
      error: error.message 
    })
  }
}

// ADMIN: DELETE DOKTER
exports.deleteDokterAdmin = async (req, res) => {
  const { id } = req.params

  try {
    // Hapus jadwal dokter terlebih dahulu
    await db.query('DELETE FROM jadwal_dokter WHERE dokter_id = ?', [id])
    
    // Hapus status kehadiran
    await db.query('DELETE FROM dokter_status WHERE dokter_id = ?', [id])
    
    // Hapus dokter
    const [result] = await db.query('DELETE FROM dokter WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Dokter tidak ditemukan' 
      })
    }

    res.json({ 
      message: 'Dokter dan data terkait berhasil dihapus',
      success: true 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ 
      message: 'Gagal menghapus dokter',
      error: error.message 
    })
  }
};
