const { Kegiatan, User, KegiatanDetail } = require('../models');

exports.getAllKegiatan = async (req, res) => {
    try {
        const kegiatan = await Kegiatan.findAll({
            include: [
                { model: User, as: 'creator', attributes: ['full_name'] },
                { model: KegiatanDetail }
            ]
        });
        res.json(kegiatan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createKegiatan = async (req, res) => {
    try {
        const { judul, deskripsi, tanggal, jam_mulai, lokasi } = req.body;

        // Create Kegiatan
        const newKegiatan = await Kegiatan.create({
            judul,
            deskripsi,
            tanggal,
            dibuat_oleh: req.userId, // Dari token middleware
            status: 'menunggu'
        });

        // Create Detail (Optional)
        if(jam_mulai || lokasi) {
            await KegiatanDetail.create({
                kegiatan_id: newKegiatan.id,
                jam_mulai,
                lokasi
            });
        }

        res.status(201).json({ message: "Kegiatan created", data: newKegiatan });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
