const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Route: GET /api/search?q=YOUR_SEARCH_WORD
// Maqsad: Website ke top Search Bar ke liye (Public Route)
router.get('/', searchController.globalSearch);

module.exports = router;