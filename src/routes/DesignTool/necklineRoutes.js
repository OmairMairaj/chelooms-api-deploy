const express = require('express');
const router = express.Router();
const necklineController = require('../../controllers/DesignTool/necklineController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware'); 

// ==========================================
// 📁 CATEGORY ROUTES
// ==========================================
router.post('/category', protect, authorize('Administrator'), upload.fields([{ name: 'categoryImage', maxCount: 1 }]), necklineController.createCategory);
router.get('/categories', necklineController.getAllCategories);
router.put('/category/:id', protect, authorize('Administrator'), upload.fields([{ name: 'categoryImage', maxCount: 1 }]), necklineController.updateCategory);

// ==========================================
// 👕 OPTION ROUTES
// ==========================================
router.post('/option', protect, authorize('Administrator'), upload.fields([{ name: 'images', maxCount: 1 }]), necklineController.createOption);
router.put('/option/:id', protect, authorize('Administrator'), upload.fields([{ name: 'images', maxCount: 1 }]), necklineController.updateOption);

// ==========================================
// 🪄 MAGIC ROUTE (Grouped Data)
// ==========================================
router.get('/', necklineController.getAllNecklinesGrouped);

module.exports = router;