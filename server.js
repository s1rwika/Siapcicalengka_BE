const express = require('express')
const cors = require('cors')
require('dotenv').config()

const apiRoutes = require('./routes/apiRoutes')

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ⬅️ SEMUA API LEWAT SINI
app.use('/api', apiRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// 🔥 LISTEN HANYA SEKALI
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`)
})
