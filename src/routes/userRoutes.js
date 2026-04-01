const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // Make sure name matches your file
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validateBody');
const { adminCreateUserSchema, adminUpdateUserSchema } = require('../validators/userSchemas');

// 1. Create User
// Chain: Login Check -> Role Check -> Controller
router.post('/create', 
    protect, 
    authorize('Administrator'), // Sirf Admin allow hai
    validateBody(adminCreateUserSchema),
    userController.createUser
);

// 2. Get All Users (List View with Pagination & Search)
router.get('/', 
    protect, 
    authorize('Administrator'), 
    userController.getAllUsers
); 

// 3. Get Single User (360-Degree View for Edit Screen)
router.get('/:id', 
    protect, 
    authorize('Administrator'), 
    userController.getUserById
);

// 4. Update User Basic Info
router.put('/:id', 
    protect, 
    authorize('Administrator'), 
    validateBody(adminUpdateUserSchema),
    userController.updateUser
);

// 5. Toggle User Status (Block / Unblock) 🔄
// Note: Changed from router.delete to router.put because we are updating status, not deleting rows.
router.put('/:id/toggle-status', 
    protect, 
    authorize('Administrator'), 
    userController.toggleUserStatus
);

// 6. Update User Sizing Profile (Customer Support Feature) 📏
// Yahan parameter mein user id nahi, balki specific sizing profile ki ID aayegi
router.put('/sizing/:profileId', 
    protect, 
    authorize('Administrator'), 
    userController.updateUserSizingByAdmin
);

module.exports = router;