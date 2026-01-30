// publicController.js
const db = require('../config/db');

exports.getKegiatanPublic = async (req, res) => {
    try {
        // Guest hanya melihat kegiatan yang sudah disetujui
        const [rows] = await db.query(`
            SELECT k.id, k.judul, k.deskripsi, k.tanggal, k.lokasi, k.jam_mulai, k.jam_selesai, 
                   jk.jenis_kegiatan 
            FROM kegiatan k 
            JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            WHERE k.status = 'disetujui'
            ORDER BY k.tanggal DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDetailKegiatanPublic = async (req, res) => {
    try {
        const { id } = req.params;
        const [kegiatan] = await db.query(`
            SELECT k.*, jk.jenis_kegiatan 
            FROM kegiatan k 
            JOIN jenis_kegiatan jk ON k.jenis_kegiatan_id = jk.id
            WHERE k.id = ?
        `, [id]);

        if (kegiatan.length === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });

        // PERBAIKAN: kegiatan_review tidak punya kegiatan_id, hanya laporan_id
        // Untuk mengambil review kegiatan, kita perlu mencari melalui laporan
        // Tapi endpoint ini mungkin tidak memerlukan reviews jika hanya untuk kegiatan
        const [reviews] = await db.query(`
            SELECT kr.id, kr.pesan, kr.rating, kr.tanggal, u.full_name 
            FROM kegiatan_review kr 
            JOIN users u ON kr.user_id = u.id 
            JOIN laporan l ON kr.laporan_id = l.id
            WHERE l.kegiatan_id = ?
            ORDER BY kr.tanggal DESC
        `, [id]);

        res.json({ 
            kegiatan: kegiatan[0], 
            reviews,
            note: 'Reviews diambil melalui relasi laporan'
        });
    } catch (error) {
        console.error('Error in getDetailKegiatanPublic:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
};

exports.getReviewsByLaporanPublic = async (req, res) => {
  try {
    const { laporanId } = req.params;
    
    console.log(`Fetching public reviews for laporan ID: ${laporanId}`);
    
    // Validasi input
    if (!laporanId || isNaN(laporanId)) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid'
      });
    }
    
    // Query yang benar berdasarkan struktur database
    const [reviews] = await db.query(`
      SELECT 
        r.id,
        r.laporan_id,
        r.user_id,
        r.pesan,
        r.rating,
        r.tanggal,
        u.full_name
      FROM kegiatan_review r
      JOIN users u ON r.user_id = u.id
      WHERE r.laporan_id = ?
      ORDER BY r.tanggal DESC
    `, [laporanId]);
    
    console.log(`Found ${reviews?.length || 0} reviews`);
    
    // Hitung statistik
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM kegiatan_review
      WHERE laporan_id = ?
    `, [laporanId]);
    
    const reviewStats = {
      total_reviews: stats[0]?.total_reviews || 0,
      average_rating: stats[0]?.average_rating ? 
        parseFloat(stats[0].average_rating).toFixed(1) : '0.0'
    };
    
    res.json({
      success: true,
      reviews: reviews || [],
      stats: reviewStats
    });
    
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// Tambahkan endpoint untuk debugging
exports.getReviewTableInfo = async (req, res) => {
  try {
    // Cek struktur tabel
    const [columns] = await db.query(`
      SHOW COLUMNS FROM kegiatan_review
    `);
    
    // Cek data sample
    const [sampleData] = await db.query(`
      SELECT * FROM kegiatan_review LIMIT 5
    `);
    
    // Cek laporan sample
    const [laporanSample] = await db.query(`
      SELECT * FROM laporan LIMIT 5
    `);
    
    res.json({
      columns,
      sampleReviews: sampleData,
      sampleLaporan: laporanSample,
      info: 'Debug info untuk struktur database'
    });
  } catch (error) {
    console.error('Error getting table info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Di publicController.js - tambahkan fungsi test
exports.testReviewConnection = async (req, res) => {
  try {
    const laporanId = req.query.laporan_id || 8; // Default ID 8
    
    // Test query sederhana
    const [reviews] = await db.query(`
      SELECT * FROM kegiatan_review WHERE laporan_id = ? LIMIT 5
    `, [laporanId]);
    
    // Test join dengan users
    const [reviewsWithUsers] = await db.query(`
      SELECT 
        r.*,
        u.full_name
      FROM kegiatan_review r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.laporan_id = ?
      LIMIT 5
    `, [laporanId]);
    
    // Test statistik
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM kegiatan_review
      WHERE laporan_id = ?
    `, [laporanId]);
    
    res.json({
      success: true,
      laporan_id: laporanId,
      reviews_count: reviews.length,
      reviews_sample: reviews,
      reviews_with_users: reviewsWithUsers,
      stats: stats[0] || { total_reviews: 0, average_rating: 0 },
      message: 'Test query berhasil'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      sql: error.sql
    });
  }
};