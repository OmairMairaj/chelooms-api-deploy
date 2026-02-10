const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/tokenGenerator');

const registerUser = async (userData) => {
    const { full_name, email, password, mobile_number } = userData;

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
            full_name,
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


const loginUser = async ({ email, password }) => {
    // 1. User dhoondo email se
    const user = await prisma.user.findUnique({
        where: { email: email }
    });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // 2. Password Match Karo
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // 3. Token Generate Karo
    const token = generateToken(user.user_id);

    // 4. Return Data (Password hata ke)
    const { password_hash, ...userData } = user;
    
    return { user: userData, token };
};

module.exports = {
    registerUser,
    loginUser
};