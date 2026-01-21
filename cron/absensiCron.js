const cron = require('node-cron')
const db = require('../config/db') // mysql2 promise pool

cron.schedule('* * * * *', async () => {
  console.log('[CRON] cek jam jadwal dokter...')

  try {
    const now = new Date()
    const menitSekarang = now.getHours() * 60 + now.getMinutes()

    // Ambil jam selesai dokter (hari ini)
    const [rows] = await db.query(`
      SELECT jam_selesai
      FROM jadwal_dokter
      WHERE DATE(created_at) = CURDATE()
      LIMIT 1
    `)

    if (rows.length === 0) return

    const jamSelesai = rows[0].jam_selesai

    const menitSelesai =
      parseInt(jamSelesai.split(':')[0]) * 60 +
      parseInt(jamSelesai.split(':')[1])

    if (menitSekarang >= menitSelesai) {
      console.log('[CRON] Jam selesai → status nonaktif')

      await db.query(`
        UPDATE jadwal_dokter
        SET status = 'nonaktif'
        WHERE status = 'aktif'
      `)
    }
  } catch (err) {
    console.error('[CRON ERROR]', err.message)
  }
})
