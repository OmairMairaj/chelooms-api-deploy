const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

// Route: GET /api/gallery/items
// Maqsad: Customers ko inventory dikhana (With Filters & Pagination)
// Note: Yahan 'protect' middleware NAHI lagaya kyunki ye public hai
router.get('/items', galleryController.getGallery);
router.get('/fabrics/facets', galleryController.getFabricFacets);

module.exports = router;