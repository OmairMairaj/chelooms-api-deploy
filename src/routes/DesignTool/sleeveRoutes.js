const express = require('express');
const router = express.Router();
const sleeveController = require('../../controllers/DesignTool/sleeveController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');   

// ==========================================
// 📁 CATEGORY ROUTES
// ==========================================

// Create Category (Requires categoryImage)
router.post('/category', 
    protect, 
    authorize('Administrator'), 
    upload.fields([{ name: 'categoryImage', maxCount: 1 }]), 
    sleeveController.createCategory
);

router.put('/category/:id', 
    protect, 
    authorize('Administrator'), 
    upload.fields([{ name: 'categoryImage', maxCount: 1 }]), 
    sleeveController.updateCategory
);

// Get All Categories (For dropdowns)
router.get('/categories', 
    sleeveController.getAllCategories
);

// Reorder Categories
router.post('/category/reorder', 
    protect, 
    authorize('Administrator'), 
    sleeveController.reorderCategories
);


// ==========================================
// 👕 OPTION ROUTES
// ==========================================

// Create Option (Requires images array/file)
router.post('/option', 
    protect, 
    authorize('Administrator'), 
    upload.fields([
        { name: 'images', maxCount: 5 },       // Main image(s) ke liye
        { name: 'layerFiles', maxCount: 15 }   // 🚀 Layers ki SVGs ke liye (MUST)
    ]), 
    sleeveController.createOption
);

// Update Option
router.put('/option/:id', 
    protect, 
    authorize('Administrator'), 
    upload.fields([
        { name: 'images', maxCount: 5 },       // Main image(s) ke liye
        { name: 'layerFiles', maxCount: 15 }   // 🚀 Layers ki SVGs ke liye (MUST)
    ]), 
    sleeveController.updateOption
);

// Reorder Options
router.post('/option/reorder', 
    protect, 
    authorize('Administrator'), 
    sleeveController.reorderOptions
);

// ==========================================
// 🪄 MAGIC ROUTE (Grouped Sleeves)
// ==========================================

// Main GET API (Returns full Parent-Child nested JSON)
router.get('/', 
    sleeveController.getAllSleevesGrouped
);

module.exports = router;