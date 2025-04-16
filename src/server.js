require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Configure CORS to allow specific origins in production
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Root route handler - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fallback route handler for SPA
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create connection configuration based on environment
const getConnectionConfig = () => {
    if (process.env.NODE_ENV === 'production') {
        // Cloud Run with Cloud SQL Auth Proxy configuration
        return {
            socketPath: `/cloudsql/${process.env.DB_HOST}`,
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
        // Local development configuration
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

// Create connection pool
const pool = mysql.createPool(getConnectionConfig());

// Test the connection and log details
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        console.error('Connection details:', {
            host: process.env.NODE_ENV === 'production' ? 'Using Cloud SQL Auth Proxy' : process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            socketPath: process.env.NODE_ENV === 'production' ? `/cloudsql/${process.env.DB_HOST}` : 'Not using socket'
        });
        return;
    }
    console.log('Successfully connected to database');
    connection.release();
});

// Initialize database - create table if not exists
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
        console.log('Database initialization completed');
    } catch (error) {
        console.error('Error initializing database:', error);
        // Don't exit the process, let it retry
    }
};

// Run the database initialization
initializeDatabase();

// Health check endpoint for Cloud Run
app.get('/_health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Form submission endpoint
app.post('/api/submit-form', async (req, res) => {
    try {
        const { store, name, email, message } = req.body;

        if (!store || !name || !email || !message) {
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required' 
            });
        }

        const [result] = await pool.promise().execute(
            'INSERT INTO form_submissions (store, name, email, message) VALUES (?, ?, ?, ?)',
            [store, name, email, message]
        );

        res.json({
            success: true,
            message: 'Form submitted successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error submitting form:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Fetch all form submissions
app.get('/api/submissions', async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT * FROM form_submissions ORDER BY id ASC'
        );
        res.json({
            success: true,
            submissions: rows
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching submissions: ' + error.message
        });
    }
});

// Update form submission
app.put('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { store, name, email, message } = req.body;

        // Input validation
        if (!store || !name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Update in database
        const [result] = await pool.promise().execute(
            'UPDATE form_submissions SET store = ?, name = ?, email = ?, message = ? WHERE id = ?',
            [store, name, email, message, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        res.json({
            success: true,
            message: 'Submission updated successfully'
        });
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating submission: ' + error.message
        });
    }
});

// Delete form submission
app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate id
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID'
            });
        }

        // Delete from database
        const [result] = await pool.promise().execute(
            'DELETE FROM form_submissions WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        res.json({
            success: true,
            message: 'Submission deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting submission'
        });
    }
});

// Fetch all roles
app.get('/api/roles', async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT * FROM role ORDER BY role_name ASC'
        );
        res.json({
            success: true,
            roles: rows
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roles: ' + error.message
        });
    }
});

// Use PORT from environment variable for Cloud Run
const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 