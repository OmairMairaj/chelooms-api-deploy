const express = require('express');
const router = express.Router();
const necklineController = require('../../controllers/DesignTool/necklineController');
const { protect, authorize } = require('../../middlewares/authMiddleware'); // Path check kar lena apne project ke hisaab se

// ==========================================
// 🎨 DESIGN TOOL: NECKLINES APIs
// ==========================================

// Route: POST /api/design-tool/necklines
// Maqsad: Admin naye neckline styles add karega
router.post('/', 
    protect, 
    authorize('Administrator'), 
    necklineController.createNeckline
);

// Route: GET /api/design-tool/necklines
// Maqsad: Frontend App (Customer) aur Admin dono list dekh sakte hain
// (Isko hum public rakh rahe hain taake customer tool load kar sake, agar protect karna ho toh add kar dena)
router.get('/', 
    necklineController.getAllNecklines
);

// Route: GET /api/design-tool/necklines/:id
// Maqsad: Kisi ek neckline ki detail nikalna
router.get('/:id', 
    necklineController.getNecklineById
);

router.put('/:id', 
    protect, 
    authorize('Administrator'), 
    necklineController.updateNeckline
);

module.exports = router;