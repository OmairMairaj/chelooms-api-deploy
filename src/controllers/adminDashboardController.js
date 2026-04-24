const adminDashboardService = require('../services/adminDashboardService');

const getDashboard = async (req, res) => {
    try {
        const data = await adminDashboardService.getAdminDashboardStats();
        res.status(200).json({
            success: true,
            message: 'Dashboard stats loaded',
            data,
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to load dashboard' });
    }
};

module.exports = {
    getDashboard,
};
