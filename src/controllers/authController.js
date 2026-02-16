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

        // 1. Mandatory Fields Check (First Name, Last Name, Password)
        if (!first_name || !last_name || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "First Name, Last Name, and Password are required." 
            });
        }

        // 2. Conditional Check (Kam se kam ek cheez honi chahiye: Email YA Mobile)
        if (!email && !mobile_number) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide either an Email or a Mobile Number." 
            });
        }

        // Service Call
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
        // 1. Input Update: Ab hum mobile_number bhi expect kar rahe hain
        const { email, mobile_number, password } = req.body;
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // 2. Validation Logic Update
        // Password zaroori hai + (Email YA Mobile mein se koi ek zaroori hai)
        if (!password || (!email && !mobile_number)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide Email or Mobile Number along with Password" 
            });
        }

        // 3. Service Call (Dono fields bhej do, service khud dekhegi kaunsa use karna hai)
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

// const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
        
//         // IP aur Device Info nikalna (Audit/Session ke liye zaroori hai)
//         const ipAddress = req.ip || req.connection.remoteAddress;
//         const userAgent = req.headers['user-agent'];

//         if (!email || !password) {
//             return res.status(400).json({ success: false, message: "Email/Password required" });
//         }

//         const { user, accessToken, refreshToken } = await authService.loginUser({ 
//             email, password, ipAddress, userAgent 
//         });

//         // 🍪 Optional: Refresh Token ko Cookie mein bhi bhej sakte hain (Secure)
//         // res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

//         res.status(200).json({
//             success: true,
//             message: "Login successful",
//             accessToken,
//             refreshToken, // Frontend isse LocalStorage/SecureStore mein rakhega
//             user
//         });
//     } catch (error) {
//         res.status(401).json({ success: false, message: error.message });
//     }
// };

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

        if (!email && !mobile_number) {
            return res.status(400).json({
                success: false,
                message: "Please provide either Email or Mobile Number."
            });
        }

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
        
        // IP Address extract (Security)
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (!provider || !token) {
            return res.status(400).json({ success: false, message: "Provider and Token are required" });
        }

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
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const result = await authService.forgotPassword(email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


const verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;
        
        // Validation
        if (!email || !code) {
            return res.status(400).json({ success: false, message: "Email and Code are required" });
        }

        // Service Call
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
        // Note: Token body mein bhi aa sakta hai ya Header mein
        // Hum simplicity ke liye Body mein le rahe hain
        const { resetToken, newPassword } = req.body;

        // Validation
        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: "Token and New Password required" });
        }

        // Service Call
        const result = await authService.resetPassword(resetToken, newPassword);

        res.status(200).json({
            success: true,
            message: result.message
        });

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
    resetPassword
};