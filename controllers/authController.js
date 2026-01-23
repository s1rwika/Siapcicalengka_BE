const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.register = async (req, res) => {
    const { username, password, full_name, role } = req.body;

    console.log('Register request received:', { 
        username, 
        full_name, 
        role,
        passwordLength: password ? password.length : 0
    });

    // Validasi input berdasarkan struktur database
    if (!username || !password) {
        return res.status(400).json({ 
            success: false,
            message: 'Username dan password wajib diisi' 
        });
    }

    // full_name bisa null di database, jadi tidak perlu wajib
    // Tapi lebih baik tetap wajib untuk UX

    // Validasi panjang username (max 100 sesuai database)
    if (username.length < 3 || username.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Username minimal 3 karakter dan maksimal 100 karakter'
        });
    }

    // Validasi panjang password
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password minimal 6 karakter'
        });
    }

    // Validasi role sesuai enum di database
    const validRoles = ['superadmin', 'admin', 'dokter', 'user'];
    const userRole = role ? role.toLowerCase() : 'user';
    
    if (!validRoles.includes(userRole)) {
        return res.status(400).json({
            success: false,
            message: `Role tidak valid. Pilih dari: ${validRoles.join(', ')}`
        });
    }

    try {
        // Cek apakah username sudah ada
        const [existingUser] = await db.query(
            'SELECT username FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Username sudah digunakan' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Attempting to insert user:', {
            username,
            full_name: full_name || null,
            role: userRole
        });

        // Insert user baru - full_name boleh NULL
        await db.query(
            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, full_name || null, userRole]
        );

        console.log('User registered successfully:', username);

        res.status(201).json({ 
            success: true,
            message: 'Registrasi berhasil',
            data: {
                username,
                full_name: full_name || null,
                role: userRole
            }
        });

    } catch (error) {
        console.error('Error in register function:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error sql:', error.sql);
        console.error('Error sqlState:', error.sqlState);
        
        // Handle specific errors berdasarkan struktur database
        if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({
                success: false,
                message: 'Data terlalu panjang. Username maksimal 100 karakter, nama maksimal 150 karakter'
            });
        }
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }
        
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({
                success: false,
                message: 'Role tidak valid. Pilih dari: superadmin, admin, dokter, user'
            });
        }
        
        if (error.code === 'WARN_DATA_TRUNCATED') {
            return res.status(400).json({
                success: false,
                message: 'Data terpotong. Pastikan input tidak melebihi batas maksimal'
            });
        }
        
        // Generic error response
        res.status(500).json({ 
            success: false,
            message: 'Terjadi kesalahan server saat registrasi',
            debug: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                message: error.message,
                sqlState: error.sqlState
            } : undefined
        });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt for:', username);

    if (!username || !password) {
        return res.status(400).json({ 
            success: false,
            message: 'Username dan password wajib diisi' 
        });
    }

    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );
        
        if (users.length === 0) {
            console.log('User not found:', username);
            return res.status(404).json({ 
                success: false,
                message: 'Username atau password salah' 
            });
        }

        const user = users[0];
        console.log('User found:', {
            id: user.id,
            username: user.username,
            role: user.role,
            hasFullName: !!user.full_name
        });

        // Verifikasi password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            console.log('Invalid password for:', username);
            return res.status(401).json({ 
                success: false,
                message: 'Username atau password salah' 
            });
        }

        // Buat Token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role, 
                full_name: user.full_name 
            }, 
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production', 
            { expiresIn: '7d' }
        );

        console.log('Login successful for:', username);

        // Response tanpa password
        const userResponse = {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            created_at: user.created_at
        };

        res.json({ 
            success: true,
            message: 'Login berhasil',
            token, 
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Terjadi kesalahan server saat login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const [users] = await db.query(
            'SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User tidak ditemukan' 
            });
        }

        res.json({
            success: true,
            message: 'Profil user',
            user: users[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// TEST FUNCTION untuk debugging
exports.testRegister = async (req, res) => {
    try {
        // Test data
        const testUser = {
            username: 'testuser_' + Date.now(),
            password: 'password123',
            full_name: 'Test User',
            role: 'user'
        };

        console.log('Testing register with:', testUser);

        // Simpan untuk testing
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        await db.query(
            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
            [testUser.username, hashedPassword, testUser.full_name, testUser.role]
        );

        res.json({
            success: true,
            message: 'Test register berhasil',
            testUser: {
                username: testUser.username,
                role: testUser.role
            }
        });

    } catch (error) {
        console.error('Test register error:', error);
        res.status(500).json({
            success: false,
            message: 'Test register gagal',
            error: {
                code: error.code,
                message: error.message,
                sqlState: error.sqlState
            }
        });
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