const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const { full_name, email, password, mobile_number } = req.body;

        // 1. Basic Validation
        if (!full_name || !email || !password || !mobile_number) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide full name, email, mobile, and password" 
            });
        }

        // 2. Service Call
        const user = await authService.registerUser({ full_name, email, password, mobile_number });

        // 3. Success Response
        res.status(201).json({
            success: true,
            message: "User registered successfully! Please verify your email.",
            data: user
        });

    } catch (error) {
        // Error Handling
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // 2. Service Call
        const { user, token } = await authService.loginUser({ email, password });

        // 3. Response
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    register,
    login
};