require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Configure CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fallback route for SPA
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create connection config
const getConnectionConfig = () => {
    if (process.env.NODE_ENV === 'production') {
        return {
            socketPath: process.env.INSTANCE_UNIX_SOCKET,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        };
    } else {
        return {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: {
                rejectUnauthorized: false
            }
        };
    }
};

// Create pool
const pool = mysql.createPool(getConnectionConfig());

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to DB:', err);
        console.error('Details:', {
            host: process.env.NODE_ENV === 'production' ? 'Cloud SQL Socket' : process.env.DB_HOST,
            user: process.env.DB_USER,
            db: process.env.DB_NAME,
            socketPath: process.env.INSTANCE_CONNECTION_NAME
        });
        return;
    }
    console.log('DB connection established');
    connection.release();
});

// DB initialization
const initializeDatabase = async () => {
    try {
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
        console.log('DB initialized');
    } catch (error) {
        console.error('Error initializing DB:', error);
    }
};
initializeDatabase();

// Health check
app.get('/_health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Submit form
app.post('/api/submit-form', async (req, res) => {
    try {
        const { store, name, email, message } = req.body;
        if (!store || !name || !email || !message) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        const [result] = await pool.promise().execute(
            'INSERT INTO form_submissions (store, name, email, message) VALUES (?, ?, ?, ?)',
            [store, name, email, message]
        );

        res.json({ success: true, message: 'Form submitted', id: result.insertId });
    } catch (error) {
        console.error('Form submission error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get submissions
app.get('/api/submissions', async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT * FROM form_submissions ORDER BY id ASC'
        );
        res.json({ success: true, submissions: rows });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
    }
});

// Update submission
app.put('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { store, name, email, message } = req.body;

        if (!store || !name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const [result] = await pool.promise().execute(
            'UPDATE form_submissions SET store = ?, name = ?, email = ?, message = ? WHERE id = ?',
            [store, name, email, message, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, message: 'Updated' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
    }
});

// Delete submission
app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        const [result] = await pool.promise().execute(
            'DELETE FROM form_submissions WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// Fetch roles
app.get('/api/roles', async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT * FROM role ORDER BY role_name ASC'
        );
        res.json({ success: true, roles: rows });
    } catch (error) {
        console.error('Fetch roles error:', error);
        res.status(500).json({ success: false, message: 'Fetch roles failed: ' + error.message });
    }
});

// Start server
const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
