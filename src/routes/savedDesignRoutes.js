const express = require('express');
const router = express.Router();
const savedDesignController = require('../controllers/savedDesignController');
const { protect } = require('../middlewares/authMiddleware');
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

module.exports = router;