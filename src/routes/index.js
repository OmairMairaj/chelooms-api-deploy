const { Router } = require('express');
const router = Router();
const authRoutes = require('./authRoutes');

// Example: const authRoutes = require('./auth.routes');
// router.use('/auth', authRoutes);

router.use('/auth', authRoutes);

router.get('/health', (req, res) => {
  res.send('Welcome to Chelooms API v1 (JavaScript Mode)');
});

module.exports = router;