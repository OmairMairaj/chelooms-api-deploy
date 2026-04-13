const express = require('express');
const router = express.Router();
const buttonOptionController = require('../../controllers/DesignTool/buttonOptionController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware'); 

// ==========================================
// 🔘 BUTTON OPTIONS ROUTES
// ==========================================

// 1. Create Button Option
router.post('/', 
    protect, 
    authorize('Administrator'), 
    upload.any(), // Allows 'images' file array
    buttonOptionController.createButtonOption
);

// 2. Get All Button Options (For the Frontend JSON)
router.get('/', 
    buttonOptionController.getAllButtonOptions
);

// 3. Update Button Option
router.put('/:id', 
    protect, 
    authorize('Administrator'), 
    upload.any(), 
    buttonOptionController.updateButtonOption
);

module.exports = router;