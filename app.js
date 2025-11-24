const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./routes');
const db = require('./models');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Gunakan Routes
app.use('/api', router);

// Test Database Connection & Server Start
db.sequelize.authenticate()
    .then(() => {
        console.log('Database connected...');
        // db.sequelize.sync(); // Hapus komentar ini jika ingin auto-create table (tapi kamu sudah punya SQL dump)
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });
    })
    .catch(err => console.log('Error: ' + err));
