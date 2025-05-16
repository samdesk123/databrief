require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

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

// Database config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  socketPath: process.env.INSTANCE_UNIX_SOCKET
};

const connection = mysql.createConnection(dbConfig);

connection.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to Cloud SQL MySQL database.');
});

const pool = mysql.createPool(getConnectionConfig());

// Create table if not exists
(async () => {
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
    const [result] = await pool.promise().execute(
        'INSERT INTO form_submissions (store, name, email, message) VALUES (?, ?, ?, ?)',
        [store, name, email, message]
    );
    res.json({ success: true, id: result.insertId });
});

// Get all submissions
app.get('/api/submissions', async (_req, res) => {
    const [rows] = await pool.promise().execute('SELECT * FROM form_submissions ORDER BY id ASC');
    res.json({ success: true, submissions: rows });
});

// Update submission
app.put('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    const { store, name, email, message } = req.body;
    if (!store || !name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const [result] = await pool.promise().execute(
        'UPDATE form_submissions SET store = ?, name = ?, email = ?, message = ? WHERE id = ?',
        [store, name, email, message, id]
    );
    result.affectedRows
        ? res.json({ success: true })
        : res.status(404).json({ success: false, message: 'Submission not found' });
});

// Delete submission
app.delete('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const [result] = await pool.promise().execute('DELETE FROM form_submissions WHERE id = ?', [id]);
    result.affectedRows
        ? res.json({ success: true })
        : res.status(404).json({ success: false, message: 'Submission not found' });
});

// Get roles
app.get('/api/roles', async (_req, res) => {
    const [rows] = await pool.promise().execute('SELECT * FROM role ORDER BY role_name ASC');
    res.json({ success: true, roles: rows });
});

// Start server
const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT);
