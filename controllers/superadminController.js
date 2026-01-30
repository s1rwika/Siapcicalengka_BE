const db = require('../config/db');
const bcrypt = require('bcrypt')

/**
 * 1. MELIHAT DAFTAR PERMINTAAN ROLE (Pending)
 * Digunakan di halaman: ApprovalDokterPage (Frontend)
 * Route: GET /api/superadmin/role-approvals
 */
exports.getRoleApprovals = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ra.*, u.username, u.full_name 
            FROM role_approval ra
            JOIN users u ON ra.user_id = u.id
            WHERE ra.status = 'menunggu'
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 2. MENYETUJUI / MENOLAK PERMINTAAN ROLE
 * Digunakan saat tombol "Terima" atau "Tolak" diklik
 * Route: PUT /api/superadmin/approve-role/:id
 */
exports.approveRole = async (req, res) => {
    const { id } = req.params; // ID dari tabel role_approval
    const { status, alasan } = req.body; // status: 'disetujui' atau 'ditolak'

    try {
        // A. Ambil data request role dari database
        const [request] = await db.query('SELECT * FROM role_approval WHERE id = ?', [id]);
        
        if (request.length === 0) {
            return res.status(404).json({ message: 'Data request tidak ditemukan' });
        }

        const roleRequest = request[0];

        // B. Tentukan Role Baru
        // Jika kolom role_baru di DB kosong/null, defaultnya kita set jadi 'dokter'
        const targetRole = roleRequest.role_baru || 'dokter';

        // C. Logika Update
        if (status === 'disetujui') {
            // Update role di tabel USERS
            await db.query('UPDATE users SET role = ? WHERE id = ?', [targetRole, roleRequest.user_id]);
        }

        // D. Update status di tabel ROLE_APPROVAL (biar hilang dari list pending)
        await db.query(
            'UPDATE role_approval SET status = ?, alasan = ? WHERE id = ?', 
            [status, alasan, id]
        );

        res.json({ 
            message: `Sukses! Permintaan telah ${status}. ${status === 'disetujui' ? 'User sekarang adalah ' + targetRole : ''}` 
        });

    } catch (error) {
        console.error("Error approveRole:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * 3. APPROVAL KEGIATAN
 * Digunakan untuk menyetujui kegiatan yang dibuat Admin agar tampil di Publik
 * Route: PUT /api/superadmin/approve-kegiatan/:id
 */
exports.approveKegiatan = async (req, res) => {
    const { id } = req.params;
    
    // Debug: lihat apa yang diterima
    console.log('Body received:', req.body);
    console.log('Params:', req.params);
    
    // Gunakan default values jika body kosong
    const body = req.body || {};
    const status = body.status || 'disetujui'; // Default ke 'disetujui'
    const catatan = body.catatan || '';
    const superadminId = req.user.id;

    try {
        // Validasi status
        if (!['disetujui', 'ditolak'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Status harus "disetujui" atau "ditolak"' 
            });
        }

        // Update status di tabel kegiatan
        const [updateResult] = await db.query(
            'UPDATE kegiatan SET status = ? WHERE id = ?', 
            [status, id]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Kegiatan tidak ditemukan' 
            });
        }

        // Catat log approval (optional)
        try {
            await db.query(
                'INSERT INTO kegiatan_approval (kegiatan_id, user_id, status, catatan) VALUES (?, ?, ?, ?)',
                [id, superadminId, status, catatan]
            );
        } catch (logError) {
            console.log("Note: Gagal mencatat log approval:", logError.message);
        }

        res.json({ 
            success: true,
            message: `Kegiatan berhasil ${status}` 
        });
    } catch (error) {
        console.error("Error approveKegiatan:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Endpoint khusus Admin: Melihat SEMUA data tanpa filter status
exports.getAllKegiatanAdmin = async (req, res) => {
    try {
        // Gunakan LEFT JOIN agar jika jenis_kegiatan terhapus, data kegiatan tetap muncul
        const [rows] = await db.query(`
            SELECT k.*, jk.jenis_kegiatan 
            FROM kegiatan k 
            LEFT JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            ORDER BY k.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* =================================
   GET KEGIATAN UNTUK APPROVAL
================================= */
exports.getApprovalKegiatan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        k.id,
        k.judul,
        k.deskripsi,
        k.tanggal,
        k.jam_mulai,
        k.jam_selesai,
        k.status,

        l.nama_lokasi,

        u.full_name AS nama_admin,

        lp.judul_laporan,
        lp.detail_kegiatan,
        lp.img
      FROM kegiatan k
      LEFT JOIN lokasi l ON k.lokasi = l.id
      LEFT JOIN users u ON k.user_id = u.id
      LEFT JOIN laporan lp ON lp.kegiatan_id = k.id
      ORDER BY k.tanggal DESC
    `)

    const formatted = rows.map(r => ({
      id: r.id,
      judul: r.judul,
      deskripsi: r.deskripsi,
      tanggal: r.tanggal,
      jam_mulai: r.jam_mulai,
      jam_selesai: r.jam_selesai,
      status: r.status,
      nama_lokasi: r.nama_lokasi,
      nama_admin: r.nama_admin,

      laporan: r.judul_laporan ? {
        judul_laporan: r.judul_laporan,
        detail_kegiatan: r.detail_kegiatan,
        img: r.img ? Buffer.from(r.img).toString('base64') : null
      } : null
    }))

    res.json(formatted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data approval kegiatan' })
  }
}

/* =================================
   APPROVE / REJECT KEGIATAN
================================= */
exports.updateStatusKegiatan = async (req, res) => {
  const { id, status } = req.params

  const newStatus =
    status === 'approve'
      ? 'disetujui'
      : status === 'reject'
      ? 'ditolak'
      : null

  if (!newStatus) {
    return res.status(400).json({ message: 'Status tidak valid' })
  }

  await db.query(
    'UPDATE kegiatan SET status = ? WHERE id = ?',
    [newStatus, id]
  )

  res.json({ message: `Kegiatan ${newStatus}` })
}

exports.approveLaporan = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      `
      UPDATE laporan
      SET status = 'disetujui'
      WHERE id = ?
      `,
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' })
    }

    res.json({ message: 'Laporan berhasil disetujui' })
  } catch (err) {
    console.error('approveLaporan:', err)
    res.status(500).json({ message: 'Gagal menyetujui laporan' })
  }
}

/* ===============================
   REJECT LAPORAN (SUPERADMIN)
================================ */
exports.rejectLaporan = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      `
      UPDATE laporan
      SET status = 'ditolak'
      WHERE id = ?
      `,
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' })
    }

    res.json({ message: 'Laporan berhasil ditolak' })
  } catch (err) {
    console.error('rejectLaporan:', err)
    res.status(500).json({ message: 'Gagal menolak laporan' })
  }
}
exports.getAllIzin = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.id,
        u.full_name AS nama_user,
        i.jenis_izin,
        i.tanggal_awal,
        i.tanggal_akhir,
        i.alasan,
        i.status_approval,
        i.created_at
      FROM pengajuan_izin i
      JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC
    `)

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil izin' })
  }}
exports.approveIzin = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      `UPDATE pengajuan_izin SET status_approval = 'Disetujui' WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Izin tidak ditemukan' })
    }

    res.json({ message: 'Izin berhasil disetujui' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal approve izin' })
  }
}

exports.rejectIzin = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      `UPDATE pengajuan_izin SET status_approval = 'Ditolak' WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Izin tidak ditemukan' })
    }

    res.json({ message: 'Izin berhasil ditolak' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal reject izin' })
  }
}


exports.createUser = async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body
    const img = req.file ? req.file.buffer : null

    // Validasi
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ 
        message: 'Semua field wajib diisi' 
      })
    }

    // Cek apakah username sudah ada
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        message: 'Username sudah digunakan' 
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    await db.query(
      `INSERT INTO users (username, password, full_name, role, img)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, full_name, role, img]
    )

    res.status(201).json({ 
      success: true,
      message: 'User berhasil ditambahkan' 
    })
  } catch (error) {
    console.error('Error createUser:', error)
    res.status(500).json({ 
      message: 'Gagal menambahkan user',
      error: error.message 
    })
  }
}

// UPDATE USER - PERBAIKI
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, password, full_name, role } = req.body
    const img = req.file ? req.file.buffer : null

    // Cek user是否存在
    const [userCheck] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    )

    if (userCheck.length === 0) {
      return res.status(404).json({ 
        message: 'User tidak ditemukan' 
      })
    }

    let updateQuery = 'UPDATE users SET username = ?, full_name = ?, role = ?'
    let queryParams = [username, full_name, role]

    // Jika ada password baru
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateQuery += ', password = ?'
      queryParams.push(hashedPassword)
    }

    // Jika ada gambar baru
    if (img) {
      updateQuery += ', img = ?'
      queryParams.push(img)
    }

    updateQuery += ' WHERE id = ?'
    queryParams.push(id)

    await db.query(updateQuery, queryParams)

    res.json({ 
      success: true,
      message: 'User berhasil diupdate' 
    })
  } catch (error) {
    console.error('Error updateUser:', error)
    res.status(500).json({ 
      message: 'Gagal mengupdate user',
      error: error.message 
    })
  }
}

// DELETE USER - PERBAIKI
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // Cek apakah user ada
    const [userCheck] = await db.query(
      'SELECT role FROM users WHERE id = ?',
      [id]
    )

    if (userCheck.length === 0) {
      return res.status(404).json({ 
        message: 'User tidak ditemukan' 
      })
    }

    // Cegah penghapusan superadmin
    if (userCheck[0].role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Tidak dapat menghapus akun superadmin' 
      })
    }

    await db.query('DELETE FROM users WHERE id = ?', [id])

    res.json({ 
      success: true,
      message: 'User berhasil dihapus' 
    })
  } catch (error) {
    console.error('Error deleteUser:', error)
    res.status(500).json({ 
      message: 'Gagal menghapus user',
      error: error.message 
    })
  }
}

// RESET PASSWORD - PERBAIKI
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params
    const { new_password } = req.body

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ 
        message: 'Password baru minimal 6 karakter' 
      })
    }

    // Cek apakah user ada
    const [userCheck] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    )

    if (userCheck.length === 0) {
      return res.status(404).json({ 
        message: 'User tidak ditemukan' 
      })
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(new_password, 10)
    
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    )

    res.json({ 
      success: true,
      message: 'Password berhasil direset' 
    })
  } catch (error) {
    console.error('Error resetPassword:', error)
    res.status(500).json({ 
      message: 'Gagal reset password',
      error: error.message 
    })
  }
}

// GET ALL USERS (untuk superadmin) - TAMBAHKAN img base64 conversion
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        username,
        full_name,
        role,
        created_at,
        img
      FROM users
      ORDER BY 
        FIELD(role, 'superadmin', 'admin', 'dokter', 'user'),
        created_at DESC
    `)
    
    // Convert img blob to base64 untuk frontend
    const usersWithImg = rows.map(user => ({
      ...user,
      img: user.img ? Buffer.from(user.img).toString('base64') : null
    }))
    
    res.json(usersWithImg)
  } catch (error) {
    console.error('Error getAllUsers:', error)
    res.status(500).json({ 
      message: 'Gagal mengambil data users',
      error: error.message 
    })
  }
}