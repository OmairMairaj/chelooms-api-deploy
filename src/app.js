const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index'); // Make sure ye path sahi ho
const inventoryRoutes = require('./routes/inventoryRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const app = express();

// --- Middlewares ---

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration (SIRF EK BAAR HONA CHAHIYE)
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL (No slash at end)
  credentials: true,               // Cookies/Token allow
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ❌ Yahan pehle 'app.use(cors());' tha, usay MAINE HATA DIYA HAI.
// Wo conflict kar raha tha.

// 3. Body Parser
app.use(express.json());

// --- Routes ---
app.use('/api/v1', routes);
app.use('/api/inventory', inventoryRoutes)
app.use('/api/gallery', galleryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
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