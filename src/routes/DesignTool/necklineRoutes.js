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

// Reorder Categories
router.post('/category/reorder', protect, authorize('Administrator'), necklineController.reorderCategories);

// ==========================================
// 👕 OPTION ROUTES
// ==========================================
router.post('/option', protect, authorize('Administrator'), upload.fields([{ name: 'images', maxCount: 5 }, 
    { name: 'layerFiles', maxCount: 10 }]), necklineController.createOption);
router.put('/option/:id', protect, authorize('Administrator'), upload.fields([{ name: 'images', maxCount: 5 }, 
    { name: 'layerFiles', maxCount: 10 }]), necklineController.updateOption);

// Reorder Options
router.post('/option/reorder', protect, authorize('Administrator'), necklineController.reorderOptions);

// ==========================================
// 🪄 MAGIC ROUTE (Grouped Data)
// ==========================================
router.get('/', necklineController.getAllNecklinesGrouped);

module.exports = router;