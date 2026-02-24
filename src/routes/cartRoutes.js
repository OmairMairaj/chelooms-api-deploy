const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { identifyUserOrGuest } = require('../middlewares/authMiddleware'); // Login zaroori hai

// 1. Cart dekhne ke liye
router.get('/', identifyUserOrGuest, cartController.getCart);

// 2. Cart mein item daalne ke liye
router.post('/add', identifyUserOrGuest, cartController.addToCart);

router.put('/update', identifyUserOrGuest, cartController.updateCartItem);
router.delete('/remove/:id', identifyUserOrGuest, cartController.removeFromCart);

module.exports = router;