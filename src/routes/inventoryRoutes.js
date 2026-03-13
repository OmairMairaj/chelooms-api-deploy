const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Note: Hum 'Inventory_Manager' role bhi add kar rahe hain
// kyunki FR-02.01 kehta hai ke Inventory Managers stock manage karenge.

// =================================================================
// 1. CATEGORY MANAGEMENT
// =================================================================

// Route: POST /api/inventory/categories
// Maqsad: Nayi category banana (e.g., Fabric, Buttons)
router.post('/categories', 
    protect, 
    authorize('Administrator', 'Inventory_Manager'), 
    inventoryController.createCategory
);

// Route: GET /api/inventory/categories
// Maqsad: Dropdown ke liye sab categories lana
// (Admin panel context mein isay protect rakha hai)
router.get('/categories', 
    protect, 
    inventoryController.getCategories
);

// =================================================================
// 2. ITEM MANAGEMENT (Fabrics & Embellishments)
// =================================================================

// Route: POST /api/inventory/items
// Maqsad: Naya maal (Item) add karna with Metadata
// router.post('/items', 
//     protect, 
//     authorize('Administrator', 'Inventory_Manager'), 
//     inventoryController.addItem
// );

// Route: GET /api/inventory/items
// Maqsad: Admin panel ki list view (With Filters)
router.get('/items', 
    protect, 
    authorize('Administrator', 'Inventory_Manager'), 
    inventoryController.getItems
);

// =================================================================
// 3. STOCK MANAGEMENT (Critical Audit Logs)
// =================================================================

// Route: PATCH /api/inventory/items/:id/stock
// Maqsad: Stock adjust karna (Add/Remove) with Reason
// Hum PUT use nahi kar rahe kyunki ye partial update hai aur Audit Log zaroori hai
router.patch('/items/:id/stock', 
    protect, 
    authorize('Administrator', 'Inventory_Manager'), 
    inventoryController.updateStock
);

router.post('/items', 
    protect, 
    authorize('Administrator', 'Inventory_Manager') , 
    
    // NAYA WRAPPER: Ye humein exact error batayega!
    function(req, res, next) {
        upload.array('images', 5)(req, res, function(err) {
            if (err) {
                console.error("🚨 CLOUDINARY/MULTER ERROR:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Image Upload Failed!", 
                    details: err.message 
                });
            }
            next(); // Agar upload successful hai, to Controller pe jao
        });
    },

    inventoryController.addItem
);


// Maqsad: Item ki basic details (Name, Price, SKU) update karna - (Stock nahi!)
router.put('/items/:id', 
    protect, 
    authorize('Administrator'), 
    inventoryController.updateItemDetails
);

// Route: PATCH /api/inventory/items/:id/toggle-status
// Maqsad: Item ko chupaana ya wapis lana (Soft Delete)
router.patch('/items/:id/toggle-status', 
    protect, 
    authorize('Administrator'), 
    inventoryController.toggleItemStatus
);

// Route: GET /api/inventory/items/:id
// Maqsad: Single item ki poori detail lana (with Audit Logs history)
router.get('/items/:id', 
    protect, 
    authorize('Administrator', 'Inventory_Manager'), 
    inventoryController.getItemById
);  

module.exports = router;