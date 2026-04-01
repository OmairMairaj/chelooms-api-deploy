const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { identifyUserOrGuest } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validateBody');
const {
  checkoutShippingSchema,
  checkoutVerifyOtpSchema,
  checkoutPlaceOrderSchema,
} = require('../validators/checkoutSchemas');

router.post(
  '/shipping',
  identifyUserOrGuest,
  validateBody(checkoutShippingSchema),
  checkoutController.saveShippingAddress
);

router.post('/send-otp', identifyUserOrGuest, checkoutController.sendOTP);

router.post(
  '/verify-otp',
  identifyUserOrGuest,
  validateBody(checkoutVerifyOtpSchema),
  checkoutController.verifyOTP
);

router.post(
  '/place-order',
  identifyUserOrGuest,
  validateBody(checkoutPlaceOrderSchema),
  checkoutController.placeOrder
);
module.exports = router;