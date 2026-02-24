const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { identifyUserOrGuest } = require('../middlewares/authMiddleware');

// Step 1: Address Save karne ka route
router.post('/shipping', identifyUserOrGuest, checkoutController.saveShippingAddress);


router.post('/send-otp', identifyUserOrGuest, checkoutController.sendOTP);
router.post('/verify-otp', identifyUserOrGuest, checkoutController.verifyOTP);

// Step 3: Final Order (Inventory Lock & ID Generation)
router.post('/place-order', identifyUserOrGuest, checkoutController.placeOrder);
module.exports = router;