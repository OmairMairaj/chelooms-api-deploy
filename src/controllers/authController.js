const authService = require('../services/authService');

// const register = async (req, res) => {
//     try {
//         const { full_name, email, password, mobile_number } = req.body;

//         // 1. Basic Validation
//         if (!full_name || !email || !password || !mobile_number) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Please provide full name, email, mobile, and password" 
//             });
//         }

//         // 2. Service Call
//         const user = await authService.registerUser({ full_name, email, password, mobile_number });

//         // 3. Success Response
//         res.status(201).json({
//             success: true,
//             message: "User registered successfully! Please verify your email.",
//             data: user
//         });

//     } catch (error) {
//         // Error Handling
//         res.status(400).json({
//             success: false,
//             message: error.message
//         });
//     }
// };


// const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // 1. Validation
//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide email and password"
//             });
//         }

//         // 2. Service Call
//         const { user, token } = await authService.loginUser({ email, password });

//         // 3. Response
//         res.status(200).json({
//             success: true,
//             message: "Login successful",
//             token,
//             user
//         });

//     } catch (error) {
//         res.status(401).json({
//             success: false,
//             message: error.message
//         });
//     }
// };


const register = async (req, res) => {
    // ... (Purana code same rahega)
    try {
        const { first_name, last_name, email, password, mobile_number } = req.body;

        if (!first_name || !last_name || !email || !password || !mobile_number) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide first name, last name, email, mobile, and password" 
            });
        }

        const user = await authService.registerUser({ 
            first_name, last_name, email, password, mobile_number 
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
            data: user
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // IP aur Device Info nikalna (Audit/Session ke liye zaroori hai)
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email/Password required" });
        }

        const { user, accessToken, refreshToken } = await authService.loginUser({ 
            email, password, ipAddress, userAgent 
        });

        // 🍪 Optional: Refresh Token ko Cookie mein bhi bhej sakte hain (Secure)
        // res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken, // Frontend isse LocalStorage/SecureStore mein rakhega
            user
        });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const { accessToken } = await authService.refreshAccessToken(refreshToken);
        
        res.status(200).json({ success: true, accessToken });
    } catch (error) {
        res.status(403).json({ success: false, message: error.message });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        await authService.logoutUser(refreshToken);
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getMe = async (req, res) => {
    // Kyunki Middleware ne user dhoond kar 'req.user' mein daal diya tha,
    // Humein bas wahi wapas bhejna hai.
    
    res.status(200).json({
        success: true,
        data: req.user
    });
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getMe
};