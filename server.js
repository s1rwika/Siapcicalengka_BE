const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/apiRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware Global
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routing
app.use('/api', apiRoutes);

// Error Handling Dasar
app.use((req, res, next) => {
    res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Koneksi DB Host: ${process.env.DB_HOST}`);
});