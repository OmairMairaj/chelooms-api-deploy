const { Router } = require('express');
const router = Router();
const authRoutes = require('./authRoutes');
const emailService = require('../services/emailService');
const userRoutes = require('./userRoutes');
// Example: const authRoutes = require('./auth.routes');
// router.use('/auth', authRoutes);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

router.get('/health', (req, res) => {
  res.send('Welcome to Chelooms API v1 (JavaScript Mode)');
});

router.get('/test-email', async (req, res) => {
  try {
      // Yahan apni ASLI email likhein jispar aap email receive karna chahte hain
      const testUser = {
          email: "muhammadraza@logixalab.com", // <--- CHANGE THIS
          first_name: "Developer"
      };

      await emailService.sendVerificationEmail(testUser, "dummy_token_123");
      
      res.status(200).json({ success: true, message: "Email Sent! Check your Inbox 📩" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;