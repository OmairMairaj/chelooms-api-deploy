const { Router } = require('express');
const router = Router();

// Example: const authRoutes = require('./auth.routes');
// router.use('/auth', authRoutes);

router.get('/', (req, res) => {
  res.send('Welcome to Chelooms API v1 (JavaScript Mode)');
});

module.exports = router;