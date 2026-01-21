const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.register = async (req, res) => {
    const { username, password, full_name } = req.body;

    if (!username || !password || !full_name) {
        return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    try {
        const [existingUser] = await db.query(
            'SELECT username FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, full_name, 'user'] // 🔒 PAKSA user
        );

        res.status(201).json({ message: 'Registrasi berhasil' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Password salah' });

        // Buat Token
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ 
            message: 'Login berhasil',
            token, 
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        // req.user.id didapat dari middleware verifyToken
        const userId = req.user.id; 
        
        // Ambil data dari database (sesuaikan dengan query DB Anda)
        // Contoh jika menggunakan mysql2/promise:
        const [users] = await db.query(
            'SELECT id, full_name, username, role FROM users WHERE id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        res.json(users[0]); // Mengirimkan full_name, role, dll ke frontend
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};