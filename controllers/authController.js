// ... existing imports
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, password, full_name, role } = req.body;
    const imgBuffer = req.file ? req.file.buffer : null;

    try {
        // 1. Cek Username
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.status(400).json({ message: 'Username sudah digunakan' });

        // 2. Tentukan Role Awal
        // Jika mendaftar sebagai 'dokter', kita simpan dulu sebagai 'user' agar tidak bisa akses fitur dokter
        let roleToSave = role;
        if (role === 'dokter') {
            roleToSave = 'user'; 
        }

        // 3. Hash Password & Insert User
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO users (username, password, full_name, role, img) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, full_name, roleToSave, imgBuffer]
        );

        const newUserId = result.insertId;

        // 4. Jika Dokter, Masukkan ke Tabel Approval
        if (role === 'dokter') {
            // role_diminta kita isi 0 atau 1 (karena tipe datanya INT dan NOT NULL di databasemu)
            // Kolom 'role' kita isi 'dokter'
            await db.query(
                `INSERT INTO role_approval (user_id, role_diminta, status, role, alasan) 
                 VALUES (?, ?, 'menunggu', 'dokter', 'Pendaftaran Dokter Baru')`,
                [newUserId, 1] 
            );
        }

        res.status(201).json({ message: role === 'dokter' ? 'Registrasi berhasil. Akun menunggu persetujuan Admin.' : 'Registrasi berhasil' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// ... existing login function ...
// Login tidak perlu diubah. 
// Karena dokter yang belum di-acc masih ber-role 'user', mereka otomatis tidak bisa masuk dashboard dokter.
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(400).json({ message: 'Password salah' });

        // Cek jika dia dokter tapi masih status 'user', mungkin beri info tambahan (Opsional)
        // Tapi logic standar login tetap jalan.
        
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        let base64Image = null;
        if (user.img) {
            base64Image = `data:image/jpeg;base64,${user.img.toString('base64')}`;
        }

        res.json({ 
            token, 
            role: user.role, // Ini akan mengirim 'user' jika belum di-approve
            full_name: user.full_name, 
            id: user.id,
            img: base64Image 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateProfilePhoto = async (req, res) => {
    // ... existing updateProfilePhoto code
    const userId = req.user.id;
    const imgBuffer = req.file ? req.file.buffer : null;

    if (!imgBuffer) return res.status(400).json({ message: "Tidak ada file yang diupload" });

    try {
        await db.query('UPDATE users SET img = ? WHERE id = ?', [imgBuffer, userId]);
        const base64Image = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
        res.json({ message: "Foto profil berhasil diupdate", img: base64Image });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
