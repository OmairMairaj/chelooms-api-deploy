const express = require('express');
const router = express.Router();
const sizingController = require('../controllers/sizingController');
const { protect } = require('../middlewares/authMiddleware');

// User/Guest ke liye (bina token ke chalega taake wo sizes dekh sakein)
router.get('/standard', sizingController.getAllStandardSizes);

// Admin ke liye (Sizes create karne ka raasta)
// Note: Abhi humne protect/authorize nahi lagaya taake aap easily test kar sako
router.post('/standard', sizingController.createStandardSize);



// User apni profile banayega aur dekhega
router.post('/profile', protect, sizingController.createUserProfile);
router.get('/profile', protect, sizingController.getUserProfiles);
module.exports = router;