const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {protect} = require('../middlewares/authMiddleware');

// POST /api/v1/auth/register
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/social-login', authController.socialLogin);

// Email ya phone se user check (puri row return)
router.post('/check-user', authController.checkUser);

// Session Management
router.post('/refresh', authController.refreshToken); // Naya token lene ke liye
router.post('/logout', authController.logout); // Logout karna

// Forgot Password
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

router.get('/me', protect, authController.getMe);

module.exports = router;