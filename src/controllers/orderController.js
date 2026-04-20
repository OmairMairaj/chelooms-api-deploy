const orderService = require('../services/orderService');

// Get Customer's Own Order History
const getMyOrderHistory = async (req, res) => {
    try {
        // req.user JWT token se aayega (protect middleware ki wajah se)
        const userId = req.user.user_id; 
        
        const result = await orderService.getMyOrderHistory(userId, req.query);

        res.status(200).json({
            success: true,
            message: "Order history fetched successfully",
            data: result.orders,
            meta: result.meta
        });
    } catch (error) {
        console.error("Error fetching order history:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Admin / inventory: all orders for panel (paginated + filters) */
const getAllOrdersAdmin = async (req, res) => {
    try {
        const result = await orderService.getAdminOrdersList(req.query);
        res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: result.orders,
            meta: result.meta,
        });
    } catch (error) {
        console.error("Error fetching admin orders:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMyOrderHistory,
    getAllOrdersAdmin,
};