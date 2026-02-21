const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const {generateAccessToken, generateRefreshToken, hashToken, generateResetToken} = require('../utils/tokenGenerator');
const { logAuthEvent } = require('./auditService');
const { verifyGoogleToken, verifyFacebookToken } = require('../utils/socialAuth');
const emailService = require('./emailService');
const jwt = require('jsonwebtoken');
const smsService = require('./smsService');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit Code

const registerUser = async (userData) => {
    const { first_name, last_name, email, password, mobile_number } = userData;

    // 1. Dynamic Check Logic (Jo cheez user ne di hai, bas wahi check karo)
    const checkConditions = [];
    if (email) checkConditions.push({ email });
    if (mobile_number) checkConditions.push({ mobile_number });

    if (checkConditions.length > 0) {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: checkConditions
            }
        });

        if (existingUser) {
            throw new Error('User already exists with this email or mobile number');
        }
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create User
    // Jo value nahi aayi (undefined), Prisma usay database mein NULL save karega automatically
    const newUser = await prisma.user.create({
        data: {
            first_name,
            last_name,
            email,           // Agar ye undefined hai to DB mein Null jayega
            mobile_number,   // Agar ye undefined hai to DB mein Null jayega
            password_hash: hashedPassword,
            role: 'Registered',
            is_email_verified: false
        }
    });

    //Email Send
    if (newUser.email) {
        // Await mat lagana taaki response fast jaye (Fire and Forget)
        emailService.sendWelcomeEmail(newUser).catch(err => console.error(err));
    }

    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

// Email ya mobile se user check karo, agar mila to puri row (password_hash ke bina) return
const getUserByEmailOrPhone = async ({ email, mobile_number }) => {
    const checkConditions = [];
    if (email) checkConditions.push({ email });
    if (mobile_number) checkConditions.push({ mobile_number });

    if (checkConditions.length === 0) return null;

    const user = await prisma.user.findFirst({
        where: {
            OR: checkConditions,
            deleted_at: null
        }
    });

    if (!user) return null;
    const { password_hash, ...userRow } = user;
    return userRow;
};



const loginUser = async ({ email, mobile_number, password, ipAddress, userAgent }) => {
    
    // 1. Determine Identifier (Log mein kya dikhana hai?)
    const identifier = email || mobile_number; 

    // 2. User Search Logic (Dynamic)
    let user;
    
    if (email) {
        user = await prisma.user.findUnique({ where: { email } });
    } else if (mobile_number) {
        user = await prisma.user.findUnique({ where: { mobile_number } });
    }

    console.log("USersss",user);
    // 3. Agar User NAHI mila
    if (!user) {
        await logAuthEvent({
            identifier: identifier, // Jo user ne dala wo log karo
            attemptType: 'login',
            status: 'failed',
            failureReason: 'User not found',
            ipAddress, userAgent
        });
        throw new Error('Invalid credentials'); // Security: "User not found" mat batao
    }

    // 4. CHECK LOCKOUT STATUS (Same as before)
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
        const timeLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        
        await logAuthEvent({
            identifier: identifier,
            attemptType: 'login',
            status: 'blocked',
            failureReason: 'Account Locked',
            ipAddress, userAgent
        });

        throw new Error(`Account locked. Try again in ${timeLeft} minutes.`);
    }

    // 5. Password Check (Same as before)
    const isMatch = await bcrypt.compare(password, user.password_hash);

    console.log("isMatch", isMatch);
    if (!isMatch) {
        const newFailedAttempts = user.failed_login_attempts + 1;
        let updateData = { failed_login_attempts: newFailedAttempts };

        if (newFailedAttempts >= 5) {
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + 30);
            updateData.locked_until = lockTime;
        }

        await prisma.user.update({
            where: { user_id: user.user_id },
            data: updateData
        });

        await logAuthEvent({
            identifier: identifier,
            attemptType: 'login',
            status: 'failed',
            failureReason: 'Invalid Password',
            ipAddress, userAgent
        });

        throw new Error(`Invalid credentials. Attempts left: ${5 - newFailedAttempts}`);
    }

    // 6. LOGIN SUCCESS (Same as before)
    await prisma.user.update({
        where: { user_id: user.user_id },
        data: { failed_login_attempts: 0, locked_until: null }
    });

    await logAuthEvent({
        identifier: identifier,
        attemptType: 'login',
        status: 'success',
        ipAddress, userAgent
    });

    // ... (Session Creation & Return Logic bilkul same rahega) ...
    // ... Neeche ka code copy paste same rakhna ...
    
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);
    const refreshTokenHash = hashToken(refreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
        data: {
            user_id: user.user_id,
            refresh_token_hash: refreshTokenHash,
            device_info: userAgent || "Unknown Device",
            ip_address: ipAddress || "0.0.0.0",
            expires_at: expiresAt
        }
    });

    const { password_hash, ...userData } = user;
    return { user: userData, accessToken, refreshToken };
};


// const loginUser = async ({ email, password, ipAddress, userAgent }) => {
//     // 1. User Find Karo
//     const user = await prisma.user.findUnique({ where: { email } });

//     // Agar user hi nahi mila
//     if (!user) {
//         await logAuthEvent({
//             identifier: email,
//             attemptType: 'login',
//             status: 'failed',
//             failureReason: 'User not found',
//             ipAddress, userAgent
//         });
//         throw new Error('Invalid email or password');
//     }

//     // 2. CHECK LOCKOUT STATUS (FR-03.29)
//     if (user.locked_until && new Date() < new Date(user.locked_until)) {
//         const timeLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        
//         await logAuthEvent({
//             identifier: email,
//             attemptType: 'login',
//             status: 'blocked',
//             failureReason: 'Account Locked',
//             ipAddress, userAgent
//         });

//         throw new Error(`Account locked. Try again in ${timeLeft} minutes.`);
//     }

//     // 3. Password Check
//     const isMatch = await bcrypt.compare(password, user.password_hash);

//     if (!isMatch) {
//         // Ghalat Password Logic
//         const newFailedAttempts = user.failed_login_attempts + 1;
//         let updateData = { failed_login_attempts: newFailedAttempts };

//         // Agar 5 attempts ho gaye -> Lock kardo 30 mins ke liye
//         if (newFailedAttempts >= 5) {
//             const lockTime = new Date();
//             lockTime.setMinutes(lockTime.getMinutes() + 30);
//             updateData.locked_until = lockTime;
//         }

//         // DB Update Karo
//         await prisma.user.update({
//             where: { user_id: user.user_id },
//             data: updateData
//         });

//         // Log Failure
//         await logAuthEvent({
//             identifier: email,
//             attemptType: 'login',
//             status: 'failed',
//             failureReason: 'Invalid Password',
//             ipAddress, userAgent
//         });

//         throw new Error(`Invalid email or password. Attempts left: ${5 - newFailedAttempts}`);
//     }

//     // 4. LOGIN SUCCESS (Agar password sahi hai)
    
//     // Reset Counters (Kyunki login sahi ho gaya)
//     await prisma.user.update({
//         where: { user_id: user.user_id },
//         data: { 
//             failed_login_attempts: 0, 
//             locked_until: null,
//             //last_active: new Date() // Optional: Track last login
//         }
//     });

//     // Log Success
//     await logAuthEvent({
//         identifier: email,
//         attemptType: 'login',
//         status: 'success',
//         ipAddress, userAgent
//     });

//     // --- SESSION CREATION (Phase 1 wala code) ---
//     const accessToken = generateAccessToken(user.user_id);
//     const refreshToken = generateRefreshToken(user.user_id);
//     const refreshTokenHash = hashToken(refreshToken);
    
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + 7);

//     await prisma.userSession.create({
//         data: {
//             user_id: user.user_id,
//             refresh_token_hash: refreshTokenHash,
//             device_info: userAgent || "Unknown Device",
//             ip_address: ipAddress || "0.0.0.0",
//             expires_at: expiresAt
//         }
//     });

//     const { password_hash, ...userData } = user;
//     return { user: userData, accessToken, refreshToken };
// };


// const loginUser = async ({ email, password, ipAddress, userAgent }) => {
//     // 1. User Validation
//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user || !await bcrypt.compare(password, user.password_hash)) {
//         throw new Error('Invalid email or password');
//     }           

//     // 2. Generate Tokens
//     const accessToken = generateAccessToken(user.user_id);
//     const refreshToken = generateRefreshToken(user.user_id);

//     // 3. Save Session to DB (Requirement: FR-03.48) 
//     const refreshTokenHash = hashToken(refreshToken);
    
//     // Refresh Token ki expiry date calculate karna (7 days from now)
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + 7);

//     await prisma.userSession.create({
//         data: {
//             user_id: user.user_id,
//             refresh_token_hash: refreshTokenHash,
//             device_info: userAgent || "Unknown Device",
//             ip_address: ipAddress || "0.0.0.0",
//             expires_at: expiresAt
//         }
//     });

//     // 4. Return
//     const { password_hash, ...userData } = user;
//     return { user: userData, accessToken, refreshToken };
// };

// Refresh Access Token (New Logic)
const refreshAccessToken = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) throw new Error("Refresh Token Required");

    // 1. Hash incoming token to match with DB
    const hashedToken = hashToken(incomingRefreshToken);

    // 2. Find Session in DB
    const session = await prisma.userSession.findFirst({
        where: { refresh_token_hash: hashedToken }
    });

    if (!session) throw new Error("Invalid Refresh Token (Session not found)");

    // 3. Check Expiry
    if (new Date() > new Date(session.expires_at)) {
        // Expired hai to delete kardo cleanup ke liye
        await prisma.userSession.delete({ where: { session_id: session.session_id } });
        throw new Error("Session Expired. Please Login Again.");
    }

    // 4. Update 'Last Active' time (FR-03.49) 
    await prisma.userSession.update({
        where: { session_id: session.session_id },
        data: { last_active: new Date() }
    });

    // 5. Generate NEW Access Token
    const newAccessToken = generateAccessToken(session.user_id);
    return { accessToken: newAccessToken };
};

// Logout User
const logoutUser = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) return;

    const hashedToken = hashToken(incomingRefreshToken);
    
    // DB se uda do (Revoke Session)
    await prisma.userSession.deleteMany({
        where: { refresh_token_hash: hashedToken }
    });
};



//Social Login
const loginWithSocial = async ({ provider, token, ipAddress, userAgent }) => {
    
    // 1. Provider ke hisab se user data nikalo
    let socialUser;
    if (provider === 'Google') {
        socialUser = await verifyGoogleToken(token);
    } else if (provider === 'Facebook') { // 'Microsoft' ki jagah Facebook
        socialUser = await verifyFacebookToken(token);
    } else {
        throw new Error('Unsupported Provider');
    }

    // 2. Check: Kya ye Social ID pehle se linked hai?
    let linkedIdentity = await prisma.socialIdentity.findUnique({
        where: {
            provider_provider_uid: { // Composite Key Search
                provider: provider,
                provider_uid: socialUser.provider_uid
            }
        },
        include: { user: true } // User ka data bhi saath le aao
    });

    let user;

    if (linkedIdentity) {
        // CASE A: User pehle se linked hai -> Direct Login
        user = linkedIdentity.user;
    } else {
        // CASE B: Link nahi hai. Check karo kya email pehle se exist karta hai?
        // Note: Agar email nahi mila (Facebook se), to humein naya user banana padega
        if (socialUser.email) {
            user = await prisma.user.findUnique({
                where: { email: socialUser.email }
            });
        }

        if (user) {
            // User mil gaya (Email match) -> Account Link kardo
            await prisma.socialIdentity.create({
                data: {
                    user_id: user.user_id,
                    provider: provider,
                    provider_uid: socialUser.provider_uid
                }
            });
        } else {
            // CASE C: Bilkul naya banda hai -> Register New User + Link Identity
            
            // Transaction use karenge taaki dono tables mein ek sath entry ho
            user = await prisma.$transaction(async (tx) => {
                // 1. Create User
                const newUser = await tx.user.create({
                    data: {
                        first_name: socialUser.first_name,
                        last_name: socialUser.last_name,
                        email: socialUser.email, // Can be null
                        is_email_verified: socialUser.is_email_verified,
                        profile_picture_url: socialUser.picture,
                        role: 'Registered'
                    }
                });

                // 2. Create Identity Link
                await tx.socialIdentity.create({
                    data: {
                        user_id: newUser.user_id,
                        provider: provider,
                        provider_uid: socialUser.provider_uid
                    }
                });

                return newUser;
            });

            if (user.email) {
                emailService.sendWelcomeEmail(user).catch(err => console.error(err));
            }
        }
    }

    // 3. Login Process (Session Generate) - Reuse existing logic
    // Hum wahi session logic use karenge jo 'loginUser' mein tha
    // Lekin code duplication se bachne ke liye hum session creation yahan repeat kar rahe hain
    // (Behtar ye hota ke session creation ka alag function hota, but abhi ke liye ye fine hai)

    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);
    const refreshTokenHash = hashToken(refreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save Session
    await prisma.userSession.create({
        data: {
            user_id: user.user_id,
            refresh_token_hash: refreshTokenHash,
            device_info: userAgent || "Unknown Device",
            ip_address: ipAddress || "0.0.0.0",
            expires_at: expiresAt
        }
    });

    // Log Audit
    await logAuthEvent({
        identifier: socialUser.email || "Social User",
        attemptType: 'login',
        status: 'success',
        ipAddress, userAgent
    });

    return { user, accessToken, refreshToken };
};




//resetPassword

const forgotPassword = async (email) => {
    // A. User Check
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error("User not found with this email");
    }
    console.log("user", user);
    // B. Generate 6-Digit OTP
    const otp = generateOTP();
    
    // C. Set Expiry (15 Minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // D. Save to Database (verification_codes table)
    // Hum 'type' field use karenge taaki ye login OTP se mix na ho
    await prisma.verificationCode.create({
        data: {
            user_id: user.user_id,
            code: otp,
            type: 'PASSWORD_RESET', // Make sure aapke DB mein ye support ho (String/Enum)
            expires_at: expiresAt,
            identifier: email
        }
    });

    // E. Send Email (Centralized Service call)
    // Await nahi lagaya taaki response fast ho (optional)
    emailService.sendPasswordResetOTP(user, otp).catch(err => console.error(err));

    return { message: "Password reset code sent to your email" };
};

const verifyResetOTP = async (email, code) => {
    // 1. User Dhundo
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    // 2. Database mein Code Check karo
    const validCode = await prisma.verificationCode.findFirst({
        where: {
            user_id: user.user_id, // Usi user ka code ho
            code: code,            // Code match kare
            type: 'PASSWORD_RESET', // Type sahi ho
            is_used: false,        // Pehle use na hua ho
            expires_at: { gt: new Date() } // Expire na hua ho (Current time se bada ho)
        }
    });

    // 3. Agar Code Ghalat hai ya Expire hai
    if (!validCode) {
        throw new Error("Invalid or expired verification code");
    }

    // 4. Code ko 'Used' mark kardo (Jala do taaki dubara use na ho)
    await prisma.verificationCode.update({
        where: { code_id: validCode.code_id },
        data: { is_used: true }
    });

    // 5. 🟢 MAIN STEP: Special Reset Token Generate karo
    const resetToken = generateResetToken(user.user_id);

    // 6. Token return karo (Frontend isay save karega agle step ke liye)
    return { 
        message: "OTP Verified", 
        resetToken: resetToken 
    };
};

// ============================================================
// 3. RESET PASSWORD (User ne Token + New Password bheja)
// ============================================================
const resetPassword = async (token, newPassword) => {
    let decoded;
    
    // 1. Token Verify karo (Kya ye hamara hi diya hua token hai?)
    try {
        console.log("Received Token:", token);
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded", decoded);
    } catch (error) {
        console.log("JWT Verification Failed:", error);
        throw new Error("Invalid or expired reset token");
    }

    // 2. 🔒 Security Check: Kya ye waqai 'Reset Token' hai?
    // (Taaki koi Login Token use karke password change na kar sake)
    if (decoded.scope !== 'password_reset') {
        throw new Error("Invalid token type");
    }

    // 3. Password Hash karo
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Database Update (Password change karo)
    await prisma.user.update({
        where: { user_id: decoded.id }, // Token mein jo ID thi
        data: { 
            password_hash: hashedPassword,
            locked_until: null,      // Account unlock kardo
            failed_login_attempts: 0 // Attempts reset kardo
        }
    });

    // 5. Success Message
    return { message: "Password reset successfully. Please login." };
};


const sendMobileOTP = async (userId) => {
    // 1. User Dhundo
    const user = await prisma.user.findUnique({
        where: { user_id: userId }
    });

    if (!user) throw new Error("User not found");
    if (!user.mobile_number) throw new Error("User does not have a mobile number linked");

    // 2. Generate 6-Digit Code
    const otp = generateOTP();

    // 3. Expiry Set Karo (5 Minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 4. Save to Database (verification_codes table)
    await prisma.verificationCode.create({
        data: {
            user_id: user.user_id,
            identifier: user.mobile_number, // Mobile number identifier hai
            code: otp,                      // OTP code
            type: 'MOBILE_OTP',             // Type alag rakhi hai
            expires_at: expiresAt
        }
    });

    // 5. SMS Service Call karo (Centralized)
    const message = `Your verification code for Chelooms is ${otp}`;
    await smsService.sendSMS(user.mobile_number, message);

    // 6. Return Code (Sirf Development/Testing ke liye return kar rahe hain)
    return { 
        message: "OTP sent to your mobile number", 
        dev_code: otp, // 👈 Frontend ko dikhane ke liye (jab tak SMS nahi chalta)
        mobile: user.mobile_number 
    };
};


const verifyMobileAndLogin = async (mobileNumber, code, deviceInfo, ipAddress) => {
    
    // 1. Database mein Code Dhundo (Identifier = Mobile Number)
    const validCode = await prisma.verificationCode.findFirst({
        where: {
            identifier: mobileNumber, // Mobile number se match karo
            code: code,               // Code match karo
            type: 'MOBILE_OTP',       // Type confirm karo
            is_used: false,           // Used nahi hona chahiye
            expires_at: { gt: new Date() } // Expire nahi hona chahiye
        },
        include: {
            user: true // User ka data bhi saath le aao
        }
    });

    if (!validCode) {
        throw new Error("Invalid or expired verification code.");
    }

    const user = validCode.user;

    // 2. Generate Tokens (Using utils/tokenGenerator.js) 🔑
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);
    
    // 3. Hash Refresh Token (For Database Security) 🔒
    const refreshTokenHash = hashToken(refreshToken);

    // 4. Calculate Session Expiry (7 Days from now)
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    // 5. Transaction: Code Used + User Update + Session Create
    await prisma.$transaction([
        // A. Mark Code as Used
        prisma.verificationCode.update({
            where: { code_id: validCode.code_id }, // Ensure your schema uses code_id
            data: { is_used: true }
        }),

        // B. Update User (Verify Mobile & Reset Counters)
        prisma.user.update({
            where: { user_id: user.user_id },
            data: { 
                is_mobile_verified: true,
                failed_login_attempts: 0,
                locked_until: null
            }
        }),

        // C. Create Session
        prisma.userSession.create({
            data: {
                user_id: user.user_id,
                refresh_token_hash: refreshTokenHash, // Hash save kar rahe hain
                device_info: deviceInfo || "Unknown Device",
                ip_address: ipAddress || "0.0.0.0",
                expires_at: sessionExpiry
            }
        })
    ]);

    // 6. Return Response
    return {
        success: true,
        message: "Login successful via Mobile OTP",
        accessToken,
        refreshToken, // User ko original token denge (Hash nahi)
        user: {
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            mobile_number: user.mobile_number,
            role: user.role
        }
    };
};


const generateOtpForMobile = async (mobileNumber) => {
    
    // 1. Purane Codes Invalidate karo (Optional but Recommended)
    // Us number ke purane unused codes delete kar do taaki confusion na ho
    await prisma.verificationCode.deleteMany({
        where: {
            identifier: mobileNumber,
            type: 'MOBILE_VERIFICATION' 
        }
    });
     console.log(mobileNumber);
    // 2. Generate 6-Digit Code
    const otp = generateOTP();

    // 3. Set Expiry (5 Minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 4. Save to Database (Bina User ID ke)
    await prisma.verificationCode.create({
        data: {
            identifier: mobileNumber,     // Mobile Number
            code: otp,                    // Generated Code
            type: 'MOBILE_VERIFICATION',  // Type
            expires_at: expiresAt,
            user_id: null                 // 👈 Yahan NULL jayega
        }
    });

    // 5. Send SMS (Mock)
    const message = `Your verification code is ${otp}`;
    await smsService.sendSMS(mobileNumber, message);

    // 6. Return Data
    return {
        success: true,
        message: "OTP generated successfully.",
        mobile: mobileNumber,
        dev_code: otp // 👈 Frontend testing ke liye
    };
};


const verifyMobileCodeSimple = async (mobileNumber, code) => {
    
    // 1. Find Valid Code
    const validCode = await prisma.verificationCode.findFirst({
        where: {
            identifier: mobileNumber, // Mobile Match
            code: code,               // Code Match
            is_used: false,           // Not Used
            expires_at: { gt: new Date() } // Not Expired
        }
    });

    if (!validCode) {
        throw new Error("Invalid or expired verification code.");
    }

    // 2. Mark as Used (Important: Taaki code expire ho jaye)
    await prisma.verificationCode.update({
        where: { code_id: validCode.code_id },
        data: { is_used: true }
    });

    return {
        success: true,
        message: "Code verified successfully.",
        mobile: mobileNumber
    };
};

module.exports = {
    registerUser,
    loginUser,
    getUserByEmailOrPhone,
    refreshAccessToken,
    logoutUser,
    loginWithSocial,
    verifyResetOTP,
    resetPassword,
    forgotPassword,
    sendMobileOTP,
    verifyMobileAndLogin,
    generateOtpForMobile,
    verifyMobileCodeSimple
};