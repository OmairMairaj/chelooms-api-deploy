const express = require('express');
const router = express.Router();
const sideSlitController = require('../../controllers/DesignTool/sideSlitController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware'); 

// ==========================================
// ✂️ SIDE SLITS ROUTES (Single Table)
// ==========================================

// 1. Create Side Slit
// Yahan humne upload.any() lagaya hai taake dynamic keys (cutout_...) allow ho sakein
router.post('/', 
    protect, 
    authorize('Administrator'), 
    upload.any(), 
    sideSlitController.createSideSlit
);

// 2. Get All Side Slits
router.get('/', 
    sideSlitController.getAllSideSlits
);

// 3. Update Side Slit
router.put('/:id', 
    protect, 
    authorize('Administrator'), 
    upload.any(), 
    sideSlitController.updateSideSlit
);

module.exports = router;