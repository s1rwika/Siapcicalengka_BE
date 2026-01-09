const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()

const apiRoutes = require('./routes/apiRoutes')

const app = express()
const PORT = process.env.PORT || 5001

// =========================
// Middleware Global
// =========================
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// =========================
// Routing API
// =========================
app.use('/api', apiRoutes)

// =========================
// 404 Handler
// =========================
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' })
})

// =========================
// Start Server
// =========================
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`)
  console.log(`DB Host: ${process.env.DB_HOST}`)
})
