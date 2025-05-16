const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Serve SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Database config using Unix Socket for Cloud Run
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    socketPath: process.env.INSTANCE_UNIX_SOCKET
};

const pool = mysql.createPool(dbConfig);

// Create tables and seed data if necessary
(async () => {
    try {
        const db = pool.promise();

        // Create form_submissions table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS form_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                store VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'form_submissions' ensured.");

        // Create role table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS role (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_name VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        console.log("✅ Table 'role' ensured.");

        // Seed default roles if table is empty
        const [existingRoles] = await db.query(`SELECT COUNT(*) as count FROM role`);
        if (existingRoles[0].count === 0) {
            await db.query(`
                INSERT INTO role (role_name)
                VALUES ('manage'), ('CA'), ('BA')
            `);
            console.log("✅ Default roles seeded.");
        }

        // Optional: List tables for debugging
        const [tables] = await db.query('SHOW TABLES');
        console.log("📋 Tables in database:", tables.map(t => Object.values(t)[0]));

    } catch (error) {
        console.error("❌ Error initializing database:", error);
    }
})();

// Health check
app.get('/_health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Submit form
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

// Get all submissions
app.get('/api/submissions', async (_req, res) => {
    try {
        const [rows] = await pool.promise().execute('SELECT * FROM form_submissions ORDER BY id ASC');
        res.json({ success: true, submissions: rows });
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Update submission
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
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Delete submission
app.delete('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    try {
        const [result] = await pool.promise().execute('DELETE FROM form_submissions WHERE id = ?', [id]);
        result.affectedRows
            ? res.json({ success: true })
            : res.status(404).json({ success: false, message: 'Submission not found' });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get roles
app.get('/api/roles', async (_req, res) => {
    try {
        console.log("🔍 Fetching roles...");
        const [rows] = await pool.promise().execute('SELECT role_name FROM role ORDER BY role_name ASC');
        res.json({ success: true, roles: rows });
    } catch (err) {
        console.error('❌ Error loading roles:', err.message, err.stack);
        res.status(500).json({ success: false, message: 'Failed to load roles' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
