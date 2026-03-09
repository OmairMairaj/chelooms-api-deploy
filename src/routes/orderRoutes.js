const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

// Route: GET /api/orders/my-orders
// User ki apni order history dekhne ke liye
router.get('/my-orders', protect, orderController.getMyOrderHistory);

module.exports = router;