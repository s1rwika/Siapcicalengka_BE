const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'siap_cicalengka'
});

// Menggunakan promise wrapper agar bisa menggunakan async/await
const promiseDb = db.promise();

module.exports = promiseDb;
