const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const adminDashboardController = require('../controllers/adminDashboardController');

router.get(
    '/dashboard',
    protect,
    authorize('Administrator', 'Inventory_Manager'),
    adminDashboardController.getDashboard
);

module.exports = router;
