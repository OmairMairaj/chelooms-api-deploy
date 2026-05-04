const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
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
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const app = express();


// --- Middlewares ---

// 1. Security Headers
app.use(helmet());
app.use(compression());

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
  'https://chelooms-frontend-deploy.vercel.app',
  'https://chelooms-admin-deploy.vercel.app',
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

// 3.1 Public API caching hints (browser/CDN friendly)
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  // High-churn list endpoints — small TTL, generous SWR.
  if (
    req.path.startsWith('/api/gallery/items') ||
    req.path === '/api/gallery/fabrics/facets' ||
    req.path.startsWith('/api/design-tool/saved-designs/published')
  ) {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return next();
  }
  // Catalog data that changes only on admin edits — longer TTL with SWR.
  if (
    req.path.startsWith('/api/design-tool/products') ||
    req.path.startsWith('/api/design-tool/product-categories') ||
    req.path.startsWith('/api/design-tool/necklines') ||
    req.path.startsWith('/api/design-tool/sleeves') ||
    req.path.startsWith('/api/design-tool/hemlines') ||
    req.path.startsWith('/api/design-tool/side-slits') ||
    req.path.startsWith('/api/design-tool/embellishments') ||
    req.path.startsWith('/api/design-tool/button-options')
  ) {
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
  }
  next();
});

// 4. Static uploads (local disk fallback for images/thumbnails)
// When Cloudinary is not configured, multer stores files in `<project>/uploads`.
// Expose them at `/uploads/*` so frontend image URLs can load.
const uploadsDir = path.join(process.cwd(), 'uploads');
let canServeUploads = false;
const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
if (!isServerlessRuntime) {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    canServeUploads = true;
  } catch (err) {
    // Do not crash API startup if local upload directory cannot be created.
    console.warn('[uploads] local uploads directory unavailable:', err.message);
  }
}
if (canServeUploads) {
  app.use('/uploads', express.static(uploadsDir));
}

// --- Public root endpoint ---
// Browser-friendly landing page for the API base URL.
app.get('/', (req, res) => {
  const now = new Date().toISOString();
  res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CHELOOMS API</title>
    <style>
      :root {
        --bg: #0b0b10;
        --card: #13131a;
        --text: #f7f7fb;
        --muted: #b8b8c7;
        --accent: #f2c94c;
        --border: #242432;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, Segoe UI, Roboto, Arial, sans-serif;
        background: radial-gradient(1200px 700px at 20% 0%, #1f1f2f 0%, var(--bg) 60%);
        color: var(--text);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(880px, 100%);
        background: linear-gradient(180deg, #171722 0%, var(--card) 100%);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      h1 {
        margin: 0;
        font-size: 26px;
        letter-spacing: 0.2px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid #2f4f2f;
        background: rgba(34, 197, 94, 0.12);
        color: #b7f7c9;
        font-weight: 600;
        font-size: 13px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
      }
      p {
        margin: 12px 0 20px;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      a {
        display: block;
        text-decoration: none;
        color: var(--text);
        background: #1a1a24;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        transition: 160ms ease;
      }
      a:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .label {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 6px;
      }
      .path {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 13px;
        word-break: break-all;
      }
      .footer {
        margin-top: 16px;
        color: var(--muted);
        font-size: 12px;
      }
      code {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="top">
        <h1>CHELOOMS API</h1>
        <span class="pill"><span class="dot"></span> Online</span>
      </div>
      <p>Backend is running. Use the endpoints below for health checks and integrations.</p>
      <section class="grid">
        <a href="/api/v1/health">
          <div class="label">Health</div>
          <div class="path">/api/v1/health</div>
        </a>
        <a href="/api/gallery/items">
          <div class="label">Gallery Items</div>
          <div class="path">/api/gallery/items</div>
        </a>
        <a href="/api/sizing/standard">
          <div class="label">Standard Sizes</div>
          <div class="path">/api/sizing/standard</div>
        </a>
        <a href="/api/inventory/dropdown">
          <div class="label">Inventory Dropdown</div>
          <div class="path">/api/inventory/dropdown</div>
        </a>
        <a href="/api/design-tool/necklines">
          <div class="label">Design Tool: Necklines</div>
          <div class="path">/api/design-tool/necklines</div>
        </a>
        <a href="/api/design-tool/sleeves">
          <div class="label">Design Tool: Sleeves</div>
          <div class="path">/api/design-tool/sleeves</div>
        </a>
        <a href="/api/design-tool/hemlines">
          <div class="label">Design Tool: Hemlines</div>
          <div class="path">/api/design-tool/hemlines</div>
        </a>
        <a href="/api/design-tool/side-slits">
          <div class="label">Design Tool: Side Slits</div>
          <div class="path">/api/design-tool/side-slits</div>
        </a>
        <a href="/api/design-tool/embellishments">
          <div class="label">Design Tool: Embellishments</div>
          <div class="path">/api/design-tool/embellishments</div>
        </a>
        <a href="/api/design-tool/button-options">
          <div class="label">Design Tool: Button Options</div>
          <div class="path">/api/design-tool/button-options</div>
        </a>
        <a href="/api/design-tool/product-categories">
          <div class="label">Design Tool: Product Categories</div>
          <div class="path">/api/design-tool/product-categories</div>
        </a>
        <a href="/api/design-tool/products/grouped/categories">
          <div class="label">Design Tool: Products Grouped</div>
          <div class="path">/api/design-tool/products/grouped/categories</div>
        </a>
        <a href="/api/design-tool/saved-designs/published">
          <div class="label">Published Designs</div>
          <div class="path">/api/design-tool/saved-designs/published</div>
        </a>
      </section>
      <div class="footer">
        Timestamp: <code>${now}</code>
      </div>
    </main>
  </body>
</html>`);
});

// --- Routes ---
app.use('/api/v1', routes);
app.use('/api/v1/admin', adminRoutes);
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
app.use('/api/contact', contactRoutes);
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