const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validateBody');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  checkUserSchema,
  socialLoginSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  sendMobileVerificationSchema,
  verifyMobileLoginSchema,
  sendMobileOtpSchema,
  verifyCodeOnlySchema,
} = require('../validators/authSchemas');

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/social-login', validateBody(socialLoginSchema), authController.socialLogin);

router.post('/check-user', validateBody(checkUserSchema), authController.checkUser);

router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/logout', validateBody(logoutSchema), authController.logout);

router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/verify-otp', validateBody(verifyOTPSchema), authController.verifyOTP);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

router.post(
  '/send-mobile-otp',
  validateBody(sendMobileVerificationSchema),
  authController.sendMobileVerificationCode
);
router.post('/verify-mobile-login', validateBody(verifyMobileLoginSchema), authController.verifyMobileLogin);

router.post('/send-otp', validateBody(sendMobileOtpSchema), authController.sendMobileOtp);
router.post('/verify-code', validateBody(verifyCodeOnlySchema), authController.verifyCodeOnly);

router.get('/me', protect, authController.getMe);

module.exports = router;
