const express = require('express');
const router = express.Router();
const savedDesignController = require('../controllers/savedDesignController');
const { protect, authorize, optionalAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Aapka Cloudinary Multer

// ==========================================
// 🎨 SAVED DESIGN ROUTES
// ==========================================

// Save a new design (Auth required)
// Thumbnail image (optional) ke liye multer lagaya hai
router.post(
  '/save', 
  protect, // User must be logged in
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]), 
  savedDesignController.saveDesign
);

router.patch('/:id/status', protect, savedDesignController.updateStatus);

router.get('/published', optionalAuth, savedDesignController.getPublishedDesigns);

router.get('/my-designs', protect, savedDesignController.getMyDesigns);

// Admin panel: all saved designs (paginated + filters)
router.get(
  '/admin',
  protect,
  authorize('Administrator', 'Inventory_Manager'),
  savedDesignController.getAllForAdmin
);

// 👁️ Route: Jab koi user design dekhe (Isko public rakh sakte hain taake bina login walay log bhi view barha sakein)
router.patch('/gallery/:id/view', savedDesignController.incrementView);

// ❤️ Route: Jab koi user Like dabaye (Isme `protect` middleware zaroori hai kyunki user pata hona chahiye)
router.post('/gallery/:id/like', protect, savedDesignController.toggleLike);

module.exports = router;