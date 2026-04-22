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
    try {
        const { first_name, last_name, email, password, mobile_number } = req.body;

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
        const { email, mobile_number, password } = req.body;
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const { user, accessToken, refreshToken } = await authService.loginUser({ 
            email, mobile_number, password, ipAddress, userAgent 
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
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

// Email ya phone se user check karo, agar hai to puri row return
const checkUser = async (req, res) => {
    try {
        const { email, mobile_number } = req.body;

        const user = await authService.getUserByEmailOrPhone({ email, mobile_number });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User found",
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const socialLogin = async (req, res) => {
    try {
        const { provider, token } = req.body;
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await authService.loginWithSocial({ 
            provider, token, ipAddress, userAgent 
        });

        res.status(200).json({
            success: true,
            message: `Welcome via ${provider}!`,
            ...result
        });

    } catch (error) {
        console.error("Social Login Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const result = await authService.forgotPassword(email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


const verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;

        const result = await authService.verifyResetOTP(email, code);
        
        // Success Response (Token bhej rahe hain)
        res.status(200).json({
            success: true,
            message: result.message,
            resetToken: result.resetToken // 👈 Ye Frontend ko chahiye
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// API 3: Reset Password
const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        const result = await authService.resetPassword(resetToken, newPassword);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


const sendMobileVerificationCode = async (req, res) => {
    try {
        const { userId } = req.body;

        const result = await authService.sendMobileOTP(userId);

        res.status(200).json({
            success: true,
            ...result // Isme message aur dev_code dono honge
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const verifyMobileLogin = async (req, res) => {
    try {
        const { mobileNumber, code } = req.body;

        const deviceInfo = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Service Call
        const result = await authService.verifyMobileAndLogin(
            mobileNumber, 
            code, 
            deviceInfo, 
            ipAddress
        );

        // Success Response (Same format as standard login)
        res.status(200).json(result);

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const sendMobileOtp = async (req, res) => {
    try {
        const { mobileNumber } = req.body;

        const result = await authService.generateOtpForMobile(mobileNumber);

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const verifyCodeOnly = async (req, res) => {
    try {
        const { mobileNumber, code } = req.body;

        const result = await authService.verifyMobileCodeSimple(mobileNumber, code);

        res.status(200).json(result);

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    checkUser,
    socialLogin,
    forgotPassword,
    verifyOTP,
    resetPassword,
    sendMobileVerificationCode,
    verifyMobileLogin,
    sendMobileOtp,
    verifyCodeOnly
};