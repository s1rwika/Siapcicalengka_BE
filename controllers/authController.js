const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

exports.register = async (req, res) => {
    try {
        const { username, password, full_name, role_id } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password: hashedPassword,
            full_name,
            role_id: role_id || 2 // Default role user jika kosong
        });

        res.status(201).json({ message: "User created", data: newUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Cari user beserta rolenya
        const user = await User.findOne({ 
            where: { username },
            include: [{ model: Role }] 
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Cek password (karena di DB dump kamu plain text 'user1234', 
        // kita handle logic jika password belum di-hash, tapi idealnya harus hash)
        // Code di bawah ini asumsi password di DB SUDAH di-hash.
        // Jika masih plain text dari dump sql, gunakan: if (password !== user.password) ...
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, role: user.role.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ message: "Login success", token, role: user.role.name });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
