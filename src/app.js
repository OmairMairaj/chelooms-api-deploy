const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index'); // Make sure ye path sahi ho
const inventoryRoutes = require('./routes/inventoryRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const sizingRoutes = require('./routes/sizingRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const searchRoutes = require('./routes/searchRoutes');
const necklineRoutes = require('./routes/DesignTool/necklineRoutes');
const sleeveRoutes = require('./routes/DesignTool/sleeveRoutes');
const hemlineRoutes = require('./routes/DesignTool/hemlineRoutes');
const sideSlitRoutes = require('./routes/DesignTool/sideSlitRoutes');
const embellishmentRoutes = require('./routes/DesignTool/embellishmentRoutes');
const buttonOptionRoutes = require('./routes/DesignTool/buttonOptionRoutes');
const productRoutes = require('./routes/DesignTool/productRoutes');
const productCategoryRoutes = require('./routes/DesignTool/productCategoryRoutes');
const savedDesignRoutes = require('./routes/savedDesignRoutes');
const app = express();


// --- Middlewares ---

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration
// Allow the storefront (cheloom-frontend) and admin panel (chelooms-admin) in dev.
// Next.js auto-picks the next free port (3001, 3002, ...) when the default is busy,
// so we accept any localhost/127.0.0.1 port in development. Production origins can
// be added via the CORS_ORIGINS env var (comma-separated).
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

const allowedOrigins = new Set([...defaultDevOrigins, ...envOrigins]);
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (curl, Postman, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    // In dev, be permissive for any localhost/127.0.0.1 port
    if (isDev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,               // Cookies/Token allow
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));




// 3. Body Parser
app.use(express.json());

// --- Routes ---
app.use('/api/v1', routes);
app.use('/api/inventory', inventoryRoutes)
app.use('/api/gallery', galleryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/sizing', sizingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);  
app.use('/api/search', searchRoutes);
app.use('/api/design-tool/necklines', necklineRoutes);
app.use('/api/design-tool/sleeves', sleeveRoutes);
app.use('/api/design-tool/hemlines', hemlineRoutes);
app.use('/api/design-tool/side-slits', sideSlitRoutes);
app.use('/api/design-tool/embellishments', embellishmentRoutes);
app.use('/api/design-tool/button-options', buttonOptionRoutes);
app.use('/api/design-tool/products', productRoutes);
app.use('/api/design-tool/product-categories', productCategoryRoutes);
app.use('/api/design-tool/saved-designs', savedDesignRoutes);

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