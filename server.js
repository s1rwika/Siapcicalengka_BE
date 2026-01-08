const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// 🔥 Middleware Global (INI WAJIB)
app.use(cors());
app.use(express.json()); // ⬅️ PENTING
app.use(express.urlencoded({ extended: true }));

// Routing
app.use('/api', apiRoutes);

// Error Handling Dasar
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
