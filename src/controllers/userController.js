const userService = require('../services/userService');

const createUser = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile_number, role } = req.body;

        const newUser = await userService.createUserByAdmin({
            first_name, last_name, email, mobile_number, role
        });

        // 4. Response
        res.status(201).json({
            success: true,
            message: "User created successfully. Credentials sent via email.",
            user: newUser
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        // req.query se params nikalein (e.g. ?page=1&search=Ali)
        const result = await userService.getAllUsers(req.query);

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: result.users,
            meta: result.meta // Frontend ko pagination ke liye ye chahiye hoga
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// 4. Update User
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedUser = await userService.updateUser(id, updateData);

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Delete User
// const deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const adminId = req.user.user_id; // From Middleware

//         const result = await userService.deleteUser(id, adminId);

//         res.status(200).json({
//             success: true,
//             message: result.message
//         });
//     } catch (error) {
//         res.status(400).json({ success: false, message: error.message });
//     }
// };

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.user_id; // Requires 'protect' middleware on this route

        const result = await userService.toggleUserStatus(id, adminId);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateUserSizingByAdmin = async (req, res) => {
    try {
        const { profileId } = req.params; // Sizing profile ki ID
        const { customMeasurements } = req.body;
        const adminId = req.user.user_id;

        if (!customMeasurements) {
            return res.status(400).json({ success: false, message: "Measurements are required." });
        }

        const updatedProfile = await userService.updateUserSizing(profileId, adminId, customMeasurements);
        
        res.status(200).json({
            success: true,
            message: "User's sizing profile updated successfully",
            data: updatedProfile
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserStatus,
    updateUserSizingByAdmin
};