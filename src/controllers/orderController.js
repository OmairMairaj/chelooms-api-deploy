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

const getMyOrderDetail = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { orderId } = req.params;
        const order = await orderService.getMyOrderById(userId, orderId);
        res.status(200).json({
            success: true,
            message: "Order detail fetched successfully",
            data: order,
        });
    } catch (error) {
        console.error("Error fetching order detail:", error);
        const status = error?.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || "Failed to fetch order detail" });
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

/** Admin: single order detail */
const getOrderDetailAdmin = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await orderService.getAdminOrderById(orderId);
        res.status(200).json({
            success: true,
            message: "Order detail fetched successfully",
            data: order,
        });
    } catch (error) {
        console.error("Error fetching admin order detail:", error);
        const status = error?.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || "Failed to fetch order detail" });
    }
};

/** Admin: PATCH body { operationalStatus?, paymentStatus? } */
const updateOrderStatusAdmin = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { operationalStatus, paymentStatus } = req.body || {};
        const order = await orderService.updateAdminOrderStatus(
            orderId,
            { operationalStatus, paymentStatus },
            req.user
        );
        res.status(200).json({
            success: true,
            message: 'Order status updated',
            data: order,
        });
    } catch (error) {
        console.error('Error updating admin order status:', error);
        const status = error?.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Failed to update order' });
    }
};

module.exports = {
    getMyOrderHistory,
    getMyOrderDetail,
    getAllOrdersAdmin,
    getOrderDetailAdmin,
    updateOrderStatusAdmin,
};