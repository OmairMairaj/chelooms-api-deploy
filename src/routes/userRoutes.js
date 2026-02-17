const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Route: POST /api/v1/users/create
// Chain: Login Check -> Role Check -> Controller
router.post('/create', 
    protect, 
    authorize('Administrator'), // Sirf Admin allow hai
    userController.createUser
);

//GetAllUsers
router.get('/',protect,authorize('Administrator'), userController.getAllUsers); 

// 3. Get Single User (For Edit Screen)
router.get('/:id', 
    protect, 
    authorize('Administrator'), 
    userController.getUserById
);

// 4. Update User
router.put('/:id', 
    protect, 
    authorize('Administrator'), 
    userController.updateUser
);


// 5. Delete User
router.delete('/:id', 
    protect, 
    authorize('Administrator'), 
    userController.deleteUser
);

module.exports = router;