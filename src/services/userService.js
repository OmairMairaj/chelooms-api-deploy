const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
// const { accountCreatedTemplateByAdmin } = require('../utils/emailTemplates');

const DEFAULT_PASSWORD = "chelooms@123";

// 1. CREATE USER
const createUserByAdmin = async (userData) => {
    const { first_name, last_name, email, mobile_number, role } = userData;

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const newUser = await prisma.user.create({
        data: {
            first_name,
            last_name,
            email,
            mobile_number,
            password_hash: hashedPassword,
            role: role,
            is_email_verified: true,
            is_mobile_verified: true,
            failed_login_attempts: 0
        }
    });

    // Email bhejne ka logic (Async)
    // await emailService.sendAccountCredentials(email, first_name, DEFAULT_PASSWORD);

    const { password_hash, ...userWithoutPass } = newUser;
    return userWithoutPass;
};

// 2. GET ALL USERS (List View)
const getAllUsers = async (query) => {
    const { page = 1, limit = 10, search, role } = query;
    
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause = {
        deleted_at: null, // Default: Sirf active users dikhayega
    };

    if (search) {
        whereClause.OR = [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobile_number: { contains: search } }
        ];
    }

    if (role) {
        whereClause.role = role;
    }

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            where: whereClause,
            skip: skip,
            take: pageSize,
            orderBy: { created_at: 'desc' },
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
        prisma.user.count({ where: whereClause })
    ]);

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

// 3. GET USER BY ID (360-Degree View) 🚀
const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        // Yahan se deleted_at: null hata diya, taake admin blocked users ki detail bhi dekh sake
        where: { user_id: userId }, 
        select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            mobile_number: true,
            role: true,
            is_email_verified: true,
            created_at: true,
            deleted_at: true, // Status check karne ke liye
            
            // 🚀 E-commerce Magic: User ki Sizing aur Orders include kar liye
            sizing_profiles: true, 
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 5 // Shuru mein sirf 5 recent orders dikhayenge
            }
        }
    });

    if (!user) {
        throw new Error("User not found.");
    }

    return user;
};

// 4. UPDATE USER
const updateUser = async (userId, updateData) => {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    
    if (!user || user.deleted_at) {
        throw new Error("User not found or is currently deactivated.");
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

// 5. TOGGLE USER STATUS (Soft Delete / Reactivate) 🔄
const toggleUserStatus = async (userId, adminId) => {
    if (userId === adminId) {
        throw new Error("You cannot block/delete your own account.");
    }

    const user = await prisma.user.findUnique({ where: { user_id: userId } });

    if (!user) {
        throw new Error("User not found.");
    }

    // Agar pehle se delete hai to null kardo (Reactivate), warna date daal do (Deactivate)
    const isDeleted = user.deleted_at !== null;
    
    await prisma.user.update({
        where: { user_id: userId },
        data: { 
            deleted_at: isDeleted ? null : new Date() 
        }
    });

    return { 
        message: isDeleted ? "User account reactivated successfully." : "User account deactivated successfully.",
        status: isDeleted ? "Active" : "Blocked"
    };
};

// 6. UPDATE USER SIZING (Customer Support Tool) 📏
const updateUserSizing = async (profileId, adminId, newMeasurements) => {
    // Check if profile exists
    const profile = await prisma.userSizingProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new Error("Sizing profile not found.");

    // Update the custom measurements
    const updatedProfile = await prisma.userSizingProfile.update({
        where: { id: profileId },
        data: { customMeasurements: newMeasurements }
    });

    return updatedProfile;
};

module.exports = {
    createUserByAdmin,
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserStatus, // Export name change kiya
    updateUserSizing  // Naya export
};

// const { prisma } = require('../config/db');
// const bcrypt = require('bcryptjs');
// const emailService = require('../services/emailService');
// const { accountCreatedTemplateByAdmin } = require('../utils/emailTemplates');

// // Default Password Constant
// const DEFAULT_PASSWORD = "chelooms@123";

// const createUserByAdmin = async (userData) => {
//     const { first_name, last_name, email, mobile_number, role } = userData;

//     // 1. Check Duplicates (Email or Mobile)
//     const existingUser = await prisma.user.findFirst({
//         where: {
//             OR: [
//                 { email: email },
//                 { mobile_number: mobile_number }
//             ]
//         }
//     });

//     if (existingUser) {
//         throw new Error("User with this email or mobile already exists.");
//     }

//     // 2. Hash Default Password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

//     // 3. Create User in Database
//     const newUser = await prisma.user.create({
//         data: {
//             first_name,
//             last_name,
//             email,
//             mobile_number,
//             password_hash: hashedPassword,
//             role: role,                 // Jo Admin ne select kiya (e.g. Inventory_Manager)
//             is_email_verified: true,    // Admin ne banaya hai, to verified hai
//             is_mobile_verified: true,   // Optional: Assume true for staff
//             failed_login_attempts: 0
//         }
//     });

//     // 4. Send Email with Credentials (Async - Don't wait)
//     // Hum emailService mein naya function nahi banayenge, seedha generic sendMail use kar lenge ya naya bana lenge.
//     // Behtar hai centralized service use karein.
    
//     // Yahan hum emailService ko update karke ek naya function 'sendAccountCredentials' bana sakte hain,
//     // lekin abhi simplicity ke liye direct logic samjhain:
    
//     //const html = accountCreatedTemplateByAdmin(first_name, email, DEFAULT_PASSWORD);
    
//     // Note: emailService.sendMail (Generic function) ko export karna padega 
//     // ya phir emailService.js mein ek specific function bana lein.
//     // Main assume kar raha hun hum emailService mein ek naya function add karenge (Step 3.1 dekhein neeche).
    
//     await emailService.sendAccountCredentials(email, first_name, DEFAULT_PASSWORD);

//     // 5. Return User (Password hata kar)
//     const { password_hash, ...userWithoutPass } = newUser;
//     return userWithoutPass;
// };


// const getAllUsers = async (query) => {
//     // 1. Destructure Query Parameters (Defaults set karein)
//     const { page = 1, limit = 10, search, role } = query;
    
//     const pageNumber = parseInt(page);
//     const pageSize = parseInt(limit);
//     const skip = (pageNumber - 1) * pageSize;

//     // 2. Build Search Filter (Dynamic Where Clause)
//     const whereClause = {
//         deleted_at: null, // Sirf Active users (Soft Delete check)
//     };

//     // Agar search term aaya hai (Name ya Email ke liye)
//     if (search) {
//         whereClause.OR = [
//             { first_name: { contains: search, mode: 'insensitive' } }, // Case-insensitive search
//             { last_name: { contains: search, mode: 'insensitive' } },
//             { email: { contains: search, mode: 'insensitive' } },
//             { mobile_number: { contains: search } }
//         ];
//     }

//     // Agar Role filter aaya hai (e.g., Sirf 'Inventory_Manager' chahiye)
//     if (role) {
//         whereClause.role = role;
//     }

//     // 3. Database Query (Parallel Fetch: Data + Total Count)
//     // Transaction use kar rahe hain taaki dono queries ek sath chalein (Faster)
//     const [users, total] = await prisma.$transaction([
//         prisma.user.findMany({
//             where: whereClause,
//             skip: skip,
//             take: pageSize,
//             orderBy: { created_at: 'desc' }, // Latest user sabse upar
//             select: {
//                 user_id: true,
//                 first_name: true,
//                 last_name: true,
//                 email: true,
//                 mobile_number: true,
//                 role: true,
//                 is_email_verified: true,
//                 created_at: true,
                
//             }
//         }),
//         prisma.user.count({ where: whereClause }) // Total count pagination logic ke liye
//     ]);

//     // 4. Return Formatted Data
//     return {
//         users,
//         meta: {
//             total,
//             page: pageNumber,
//             limit: pageSize,
//             totalPages: Math.ceil(total / pageSize)
//         }
//     };
// };


// const getUserById = async (userId) => {
//     const user = await prisma.user.findUnique({
//         where: { 
//             user_id: userId,
//             deleted_at: null 
//         },
//         select: {
//             user_id: true,
//             first_name: true,
//             last_name: true,
//             email: true,
//             mobile_number: true,
//             role: true,
//             is_email_verified: true,
//             created_at: true
//         }
//     });

//     if (!user) {
//         throw new Error("User not found or deactivated.");
//     }

//     return user;
// };

// // 4. UPDATE USER
// const updateUser = async (userId, updateData) => {
//     // Check User Existence
//     const user = await prisma.user.findUnique({ where: { user_id: userId } });
    
//     if (!user || user.deleted_at) {
//         throw new Error("User not found.");
//     }

//     const updatedUser = await prisma.user.update({
//         where: { user_id: userId },
//         data: {
//             first_name: updateData.first_name,
//             last_name: updateData.last_name,
//             mobile_number: updateData.mobile_number,
//             role: updateData.role,
//         },
//         select: {
//             user_id: true, first_name: true, last_name: true, 
//             email: true, role: true, mobile_number: true
//         }
//     });

//     return updatedUser;
// };

// // 5. DELETE USER (Soft Delete)
// const deleteUser = async (userId, adminId) => {
//     // Security: Admin cannot delete themselves
//     if (userId === adminId) {
//         throw new Error("You cannot delete your own account.");
//     }

//     const user = await prisma.user.findUnique({ where: { user_id: userId } });

//     if (!user || user.deleted_at) {
//         throw new Error("User not found or already deleted.");
//     }

//     await prisma.user.update({
//         where: { user_id: userId },
//         data: { 
//             deleted_at: new Date()
//         }
//     });

//     return { message: "User deactivated successfully." };
// };

// module.exports = {
//     createUserByAdmin,
//     getAllUsers,
//     getUserById,
//     updateUser,
//     deleteUser
// };