const express = require('express');
const router = express.Router();
const productController = require('../../controllers/DesignTool/productController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');



router.get('/form-options', protect, authorize('Administrator'), productController.getAdminFormOptions);
// POST /api/products
// Multer ka upload.any() use kiya hai taake images array asani se aa saken
router.post('/', 
    protect, 
    authorize('Administrator'), 
    
    function(req, res, next) {
        const multiUpload = upload.any();
        multiUpload(req, res, function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: "Upload Failed", details: err.message });
            }
            next();
        });
    }, 
    
    productController.createProduct
);

// GET /api/products/:id/canvas - E-com Frontend Master JSON API
router.get('/:id/canvas', productController.getProductForCanvas);

// 🛒 E-COM ROUTE: GET PRODUCTS BY CATEGORY NAME (e.g., /api/products/category/sherwani)
router.get('/category/:categoryName', productController.getProductsByCategory);

// 🛒 E-COM ROUTE: GET ALL PRODUCTS GROUPED BY CATEGORY
router.get('/grouped/categories', productController.getAllGroupedProducts);

// Get all products (Admin ke liye)
router.get('/admin/products', productController.getAllProducts);

// Update product
router.patch(
  '/admin/products/:id', 
  upload.any(), // Ya upload.fields() jo aapne create mein use kiya tha
  productController.updateProduct
);

module.exports = router;