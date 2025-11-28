const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Model Roles
const Role = sequelize.define('roles', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { timestamps: false });

// 2. Model Users
const User = sequelize.define('users', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    full_name: { type: DataTypes.STRING },
    role_id: { type: DataTypes.INTEGER, references: { model: Role, key: 'id' } }
}, { 
    timestamps: true, 
    createdAt: 'created_at', 
    updatedAt: false 
});

// 3. Model Kegiatan
// 3. Model Kegiatan
const Kegiatan = sequelize.define('kegiatan', {
    judul: { type: DataTypes.STRING, allowNull: false },
    deskripsi: { type: DataTypes.TEXT },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    dibuat_oleh: { type: DataTypes.INTEGER },
    status: { type: DataTypes.ENUM('menunggu', 'disetujui', 'ditolak'), defaultValue: 'menunggu' }
}, { 
    timestamps: false, 
    freezeTableName: true  // <--- TAMBAHKAN BARIS INI
});

// 4. Model Kegiatan Detail
const KegiatanDetail = sequelize.define('kegiatan_detail', {
    kegiatan_id: { type: DataTypes.INTEGER },
    jam_mulai: { type: DataTypes.TIME },
    jam_selesai: { type: DataTypes.TIME },
    lokasi: { type: DataTypes.STRING },
    catatan: { type: DataTypes.TEXT }
}, { timestamps: false, freezeTableName: true });

// --- DEFINISI RELASI (ASSOCIATIONS) ---

// User & Role
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// Kegiatan & User
User.hasMany(Kegiatan, { foreignKey: 'dibuat_oleh' });
Kegiatan.belongsTo(User, { as: 'creator', foreignKey: 'dibuat_oleh' });

// Kegiatan & Detail
Kegiatan.hasOne(KegiatanDetail, { foreignKey: 'kegiatan_id' });
KegiatanDetail.belongsTo(Kegiatan, { foreignKey: 'kegiatan_id' });

// Export semua model
const db = {
    sequelize,
    Role,
    User,
    Kegiatan,
    KegiatanDetail
};

module.exports = db;
