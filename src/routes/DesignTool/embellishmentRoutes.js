const express = require('express');
const router = express.Router();
const embellishmentController = require('../../controllers/DesignTool/embellishmentController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware'); 

// ==========================================
// 📁 CATEGORY ROUTES (Parent)
// ==========================================

// Create Category
router.post('/category', 
    protect, 
    authorize('Administrator'), 
    upload.any(), // Allows main 'image' array
    embellishmentController.createCategory
);

// Get All Categories (For Admin Dropdowns)
router.get('/categories', 
    embellishmentController.getAllCategories
);

// Update Category
router.put('/category/:id', 
    protect, 
    authorize('Administrator'), 
    upload.any(), 
    embellishmentController.updateCategory
);

// ==========================================
// ✨ OPTION ROUTES (Child) - WITH OVERLAYS
// ==========================================

// Create Option (Requires dynamic overlay_ files)
router.post('/option', 
    protect, 
    authorize('Administrator'), 
    upload.any(), // 🪄 MAGIC: Allows all dynamic overlay keys
    embellishmentController.createOption
);

// Update Option
router.put('/option/:id', 
    protect, 
    authorize('Administrator'), 
    upload.any(), 
    embellishmentController.updateOption
);

// ==========================================
// 🪄 THE MAGIC ROUTE (Grouped Nested Data)
// ==========================================

// Main GET API (Returns full Parent-Child nested JSON for the Frontend App)
router.get('/', 
    embellishmentController.getAllEmbellishmentsGrouped
);

module.exports = router;