const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const kegiatanRoutes = require('./routes/kegiatanRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Untuk membaca JSON body
app.use(express.urlencoded({ extended: true }));

// Default Route
app.get('/', (req, res) => {
    res.send('API SIAP Cicalengka Running...');
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/kegiatan', kegiatanRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Terjadi kesalahan pada server!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
