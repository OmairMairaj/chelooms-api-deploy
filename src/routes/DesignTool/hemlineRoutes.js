const express = require('express');
const router = express.Router();
const hemlineController = require('../../controllers/DesignTool/hemlineController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware'); 

// ==========================================
// 📁 CATEGORY ROUTES (Parent)
// ==========================================

// Create Category (Requires categoryImage)
router.post('/category', 
    protect, 
    authorize('Administrator'), 
    upload.fields([{ name: 'categoryImage', maxCount: 1 }]), 
    hemlineController.createCategory
);

// Get All Categories (For dropdowns)
router.get('/categories', 
    hemlineController.getAllCategories
);

// Update Category
router.put('/category/:id', 
    protect, 
    authorize('Administrator'), 
    upload.fields([{ name: 'categoryImage', maxCount: 1 }]), 
    hemlineController.updateCategory
);

// Reorder Categories
router.post('/category/reorder', 
    protect, 
    authorize('Administrator'), 
    hemlineController.reorderCategories
);

// ==========================================
// 👕 OPTION ROUTES (Child) - WITH LAYERS
// ==========================================

// Create Option (Requires layerImages array)
router.post('/option', 
    protect, 
    authorize('Administrator'), 
    // Yahan humne maxCount 10 rakha hai taake 10 layers tak ki SVGs ek sath upload ho sakein
    upload.fields([{ name: 'layerImages', maxCount: 10 }]), 
    hemlineController.createOption
);

// Update Option
router.put('/option/:id', 
    protect, 
    authorize('Administrator'), 
    upload.fields([{ name: 'layerImages', maxCount: 10 }]), 
    hemlineController.updateOption
);

// Reorder Options
router.post('/option/reorder', 
    protect, 
    authorize('Administrator'), 
    hemlineController.reorderOptions
);

// ==========================================
// 🪄 MAGIC ROUTE (Grouped Data)
// ==========================================

// Main GET API (Returns full Parent-Child nested JSON)
router.get('/', 
    hemlineController.getAllHemlinesGrouped
);

module.exports = router;