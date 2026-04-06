const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    // These defaults match the connection you just fixed in VS Code
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

module.exports = pool;