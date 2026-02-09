const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');

const app = express();

// --- Middlewares ---
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api/v1', routes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Chelooms API' });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

module.exports = app;