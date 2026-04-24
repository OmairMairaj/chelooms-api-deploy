const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Route: GET /api/orders/admin
// Admin panel: sab orders (pagination + filters)
router.get(
    '/admin',
    protect,
    authorize('Administrator', 'Inventory_Manager'),
    orderController.getAllOrdersAdmin
);
router.get(
    '/admin/:orderId',
    protect,
    authorize('Administrator', 'Inventory_Manager'),
    orderController.getOrderDetailAdmin
);

// Route: GET /api/orders/my-orders
// User ki apni order history dekhne ke liye
router.get('/my-orders', protect, orderController.getMyOrderHistory);
router.get('/my-orders/:orderId', protect, orderController.getMyOrderDetail);

module.exports = router;