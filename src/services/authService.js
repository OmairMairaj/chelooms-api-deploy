const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const {generateAccessToken, generateRefreshToken, hashToken} = require('../utils/tokenGenerator');
const { logAuthEvent } = require('./auditService');

const registerUser = async (userData) => {
    const { first_name, last_name, email, password, mobile_number } = userData;

    // 1. Check karo user already exist to nahi karta?
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email },
                { mobile_number: mobile_number }
            ]
        }
    });

    if (existingUser) {
        throw new Error('User already exists with this email or mobile number');
    }

    // 2. Password Hash karo (Security)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. User Create karo (Database mein save)
    const newUser = await prisma.user.create({
        data: {
            first_name,
            last_name,
            email,
            mobile_number,
            password_hash: hashedPassword,
            role: 'Registered', // Default role
            is_email_verified: false
        }
    });

    // 4. Password wapas mat bhejo return mein
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};


const loginUser = async ({ email, password, ipAddress, userAgent }) => {
    // 1. User Find Karo
    const user = await prisma.user.findUnique({ where: { email } });

    // Agar user hi nahi mila
    if (!user) {
        await logAuthEvent({
            identifier: email,
            attemptType: 'login',
            status: 'failed',
            failureReason: 'User not found',
            ipAddress, userAgent
        });
        throw new Error('Invalid email or password');
    }

    // 2. CHECK LOCKOUT STATUS (FR-03.29)
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
        const timeLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        
        await logAuthEvent({
            identifier: email,
            attemptType: 'login',
            status: 'blocked',
            failureReason: 'Account Locked',
            ipAddress, userAgent
        });

        throw new Error(`Account locked. Try again in ${timeLeft} minutes.`);
    }

    // 3. Password Check
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        // Ghalat Password Logic
        const newFailedAttempts = user.failed_login_attempts + 1;
        let updateData = { failed_login_attempts: newFailedAttempts };

        // Agar 5 attempts ho gaye -> Lock kardo 30 mins ke liye
        if (newFailedAttempts >= 5) {
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + 30);
            updateData.locked_until = lockTime;
        }

        // DB Update Karo
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: updateData
        });

        // Log Failure
        await logAuthEvent({
            identifier: email,
            attemptType: 'login',
            status: 'failed',
            failureReason: 'Invalid Password',
            ipAddress, userAgent
        });

        throw new Error(`Invalid email or password. Attempts left: ${5 - newFailedAttempts}`);
    }

    // 4. LOGIN SUCCESS (Agar password sahi hai)
    
    // Reset Counters (Kyunki login sahi ho gaya)
    await prisma.user.update({
        where: { user_id: user.user_id },
        data: { 
            failed_login_attempts: 0, 
            locked_until: null,
            //last_active: new Date() // Optional: Track last login
        }
    });

    // Log Success
    await logAuthEvent({
        identifier: email,
        attemptType: 'login',
        status: 'success',
        ipAddress, userAgent
    });

    // --- SESSION CREATION (Phase 1 wala code) ---
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



module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
};