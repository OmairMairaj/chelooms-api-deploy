const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Agar aapke paas auth middlewares hain toh unhe import kar lein (jaise neeche example di hai)
// const { protect, isAdmin } = require('../middlewares/authMiddleware');

// 🌐 PUBLIC ROUTE (Frontend walay bhai ke liye)
router.post('/submit', contactController.submitContactForm);

// 🛡️ ADMIN ROUTES (In par `protect` aur `isAdmin` zaroor lagana)
// router.get('/admin/messages', protect, isAdmin, contactController.getAdminMessages);
// router.patch('/admin/messages/:id/status', protect, isAdmin, contactController.updateMessageStatus);

// Abhi testing ke liye bina middleware ke open rakh dete hain:
router.get('/admin/messages', contactController.getAdminMessages);
router.patch('/admin/messages/:id/status', contactController.updateMessageStatus);

module.exports = router;