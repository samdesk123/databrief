const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// CORS setup
app.use(cors({
    origin: '*', // You can change this to specific domain in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Database connection (Unix socket for Cloud Run)
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    socketPath: process.env.INSTANCE_UNIX_SOCKET
};

const pool = mysql.createPool(dbConfig);

// Ensure required tables exist
(async () => {
    try {
        // Create form_submissions table
        await pool.promise().execute(`
            CREATE TABLE IF NOT EXISTS form_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                store VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create roles table
        await pool.promise().execute(`
            CREATE TABLE IF NOT EXISTS role (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_name VARCHAR(100) UNIQUE NOT NULL
            )
        `);

        // Insert roles if empty
        const [rows] = await pool.promise().query('SELECT COUNT(*) as count FROM role');
        if (rows[0].count === 0) {
            await pool.promise().query(`
                INSERT INTO role (role_name) VALUES ('Manager'), ('CA'), ('BA')
            `);
            console.log("Inserted default roles.");
        }

        console.log("Tables ensured.");
    } catch (error) {
        console.error("Error setting up database:", error);
    }
})();

// Health check
app.get('/_health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// API: Submit form
app.post('/api/submit-form', async (req, res) => {
    const { store, name, email, message } = req.body;
    if (!store || !name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    try {
        const [result] = await pool.promise().execute(
            'INSERT INTO form_submissions (store, name, email, message) VALUES (?, ?, ?, ?)',
            [store, name, email, message]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error("Insert error:", err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// API: Get all submissions
app.get('/api/submissions', async (_req, res) => {
    try {
        const [rows] = await pool.promise().execute('SELECT * FROM form_submissions ORDER BY id ASC');
        res.json({ success: true, submissions: rows });
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// API: Update submission
app.put('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    const { store, name, email, message } = req.body;

    if (!store || !name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const [result] = await pool.promise().execute(
            'UPDATE form_submissions SET store = ?, name = ?, email = ?, message = ? WHERE id = ?',
            [store, name, email, message, id]
        );
        result.affectedRows
            ? res.json({ success: true })
            : res.status(404).json({ success: false, message: 'Submission not found' });
