const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { protect } = require('../middlewares/authMiddleware');

// Route: GET /api/gallery/items
// Maqsad: Customers ko inventory dikhana (With Filters & Pagination)
// Note: Yahan 'protect' middleware NAHI lagaya kyunki ye public hai
router.get('/items', galleryController.getGallery);
router.get('/fabrics/facets', galleryController.getFabricFacets);

// 👁️ View Increment Route (Public - koi bhi open kare toh view count barhe)
// Method PATCH rakha hai kyunki sirf ek choti si field update ho rahi hai
router.patch('/items/:id/view', galleryController.incrementView);

// ❤️ Toggle Like Route (Protected - Sirf logged-in users ke liye)
// Isme Header mein Authorization Bearer token bhejna lazmi hoga
router.post('/items/:id/like', protect, galleryController.toggleLike);

module.exports = router;