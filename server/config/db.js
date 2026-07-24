const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool (better than a single connection --
// it reuses connections instead of opening a new one for every query)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'petpaw',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// We use the promise-based version so we can use async/await in our models
const promisePool = pool.promise();

// Simple helper to confirm the database connection works when the server starts
const testConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT DATABASE() AS db');
        console.log('✅ Connected to MySQL database:', rows[0].db);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
};

module.exports = { pool: promisePool, testConnection };