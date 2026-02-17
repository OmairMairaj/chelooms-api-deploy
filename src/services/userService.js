const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { accountCreatedTemplateByAdmin } = require('../utils/emailTemplates');

// Default Password Constant
const DEFAULT_PASSWORD = "chelooms@123";

const createUserByAdmin = async (userData) => {
    const { first_name, last_name, email, mobile_number, role } = userData;

    // 1. Check Duplicates (Email or Mobile)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email },
                { mobile_number: mobile_number }
            ]
        }
    });

    if (existingUser) {
        throw new Error("User with this email or mobile already exists.");
    }

    // 2. Hash Default Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    // 3. Create User in Database
    const newUser = await prisma.user.create({
        data: {
            first_name,
            last_name,
            email,
            mobile_number,
            password_hash: hashedPassword,
            role: role,                 // Jo Admin ne select kiya (e.g. Inventory_Manager)
            is_email_verified: true,    // Admin ne banaya hai, to verified hai
            is_mobile_verified: true,   // Optional: Assume true for staff
            failed_login_attempts: 0
        }
    });

    // 4. Send Email with Credentials (Async - Don't wait)
    // Hum emailService mein naya function nahi banayenge, seedha generic sendMail use kar lenge ya naya bana lenge.
    // Behtar hai centralized service use karein.
    
    // Yahan hum emailService ko update karke ek naya function 'sendAccountCredentials' bana sakte hain,
    // lekin abhi simplicity ke liye direct logic samjhain:
    
    //const html = accountCreatedTemplateByAdmin(first_name, email, DEFAULT_PASSWORD);
    
    // Note: emailService.sendMail (Generic function) ko export karna padega 
    // ya phir emailService.js mein ek specific function bana lein.
    // Main assume kar raha hun hum emailService mein ek naya function add karenge (Step 3.1 dekhein neeche).
    
    await emailService.sendAccountCredentials(email, first_name, DEFAULT_PASSWORD);

    // 5. Return User (Password hata kar)
    const { password_hash, ...userWithoutPass } = newUser;
    return userWithoutPass;
};


const getAllUsers = async (query) => {
    // 1. Destructure Query Parameters (Defaults set karein)
    const { page = 1, limit = 10, search, role } = query;
    
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // 2. Build Search Filter (Dynamic Where Clause)
    const whereClause = {
        deleted_at: null, // Sirf Active users (Soft Delete check)
    };

    // Agar search term aaya hai (Name ya Email ke liye)
    if (search) {
        whereClause.OR = [
            { first_name: { contains: search, mode: 'insensitive' } }, // Case-insensitive search
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobile_number: { contains: search } }
        ];
    }

    // Agar Role filter aaya hai (e.g., Sirf 'Inventory_Manager' chahiye)
    if (role) {
        whereClause.role = role;
    }

    // 3. Database Query (Parallel Fetch: Data + Total Count)
    // Transaction use kar rahe hain taaki dono queries ek sath chalein (Faster)
    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            where: whereClause,
            skip: skip,
            take: pageSize,
            orderBy: { created_at: 'desc' }, // Latest user sabse upar
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile_number: true,
                role: true,
                is_email_verified: true,
                created_at: true,
                
            }
        }),
        prisma.user.count({ where: whereClause }) // Total count pagination logic ke liye
    ]);

    // 4. Return Formatted Data
    return {
        users,
        meta: {
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize)
        }
    };
};


const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { 
            user_id: userId,
            deleted_at: null 
        },
        select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            mobile_number: true,
            role: true,
            is_email_verified: true,
            created_at: true
        }
    });

    if (!user) {
        throw new Error("User not found or deactivated.");
    }

    return user;
};

// 4. UPDATE USER
const updateUser = async (userId, updateData) => {
    // Check User Existence
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    
    if (!user || user.deleted_at) {
        throw new Error("User not found.");
    }

    const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: {
            first_name: updateData.first_name,
            last_name: updateData.last_name,
            mobile_number: updateData.mobile_number,
            role: updateData.role,
        },
        select: {
            user_id: true, first_name: true, last_name: true, 
            email: true, role: true, mobile_number: true
        }
    });

    return updatedUser;
};

// 5. DELETE USER (Soft Delete)
const deleteUser = async (userId, adminId) => {
    // Security: Admin cannot delete themselves
    if (userId === adminId) {
        throw new Error("You cannot delete your own account.");
    }

    const user = await prisma.user.findUnique({ where: { user_id: userId } });

    if (!user || user.deleted_at) {
        throw new Error("User not found or already deleted.");
    }

    await prisma.user.update({
        where: { user_id: userId },
        data: { 
            deleted_at: new Date()
        }
    });

    return { message: "User deactivated successfully." };
};

module.exports = {
    createUserByAdmin,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};