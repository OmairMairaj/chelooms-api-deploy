const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

// ==========================================
// 1. PROTECT (Authentication - Login Check)
// ==========================================
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Token nikalo
            token = req.headers.authorization.split(' ')[1];

            // Token Verify Karo
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 🚀 FRONTEND FIX: Token payload se ID nikalne ka smart tareeqa
            const userId = decoded.user_id || decoded.id || decoded.sub;

            if (!userId) {
                 return res.status(401).json({ success: false, message: "Invalid token structure" });
            }

            // User dhoondo (Deleted users ko ignore karo)
            const user = await prisma.user.findFirst({
                where: { 
                    user_id: userId, // 👈 Yahan update ho gaya
                    deleted_at: null // Sirf Active users
                },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true // 👈 Ye zaroori hai agle middleware ke liye
                }
            });

            if (!user) {
                return res.status(401).json({ success: false, message: "User not found or deactivated" });
            }

            // User ko request object mein daal do taaki agle function ko mile
            req.user = user;
            
            return next(); // Return lagana behtar hai taaki code yahi ruk jaye

        } catch (error) {
            console.error("Auth Error:", error.message);
            return res.status(401).json({ success: false, message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
};

// ==========================================
// 2. AUTHORIZE (Authorization - Role Check)
// ==========================================
// Isay aise call karenge: authorize('Administrator', 'Inventory_Manager')
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Pehle check karo ke 'protect' middleware chala tha ya nahi (req.user hona chahiye)
        if (!req.user) {
            return res.status(401).json({ success: false, message: "User verification failed" });
        }

        // Check karo ke User ka Role allowed list mein hai ya nahi
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access Denied: ${req.user.role}s are not allowed to access this resource.` 
            });
        }

        next(); // Sab sahi hai, aage badho
    };
};

// ==========================================
// 3. IDENTIFY (Guest or Registered User)
// ==========================================
const identifyUserOrGuest = async (req, res, next) => {
    let token;
  
    // 1. Check for Token (Registered User)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🚀 FRONTEND FIX APPLIED HERE TOO
        const userId = decoded.user_id || decoded.id || decoded.sub;

        if (userId) {
            req.user = await prisma.user.findUnique({ where: { user_id: userId } });
        }
      } catch (error) {
        console.log("Token invalid, treating as Guest");
      }
    }
  
    // 2. Check for Guest ID (Frontend se aayega)
    // Guest ID frontend generate karega (UUID) aur body/headers mein bhejega
    const guestId = req.headers['x-guest-id'] || req.body?.guestId;
  
    if (!req.user && !guestId) {
      return res.status(401).json({ success: false, message: "Identification required (Token or Guest ID)" });
    }
  
    // Request object mein guestId set kardo taake controller use kar sake
    req.guestId = guestId;
    next();
  };
  
module.exports = { protect, authorize, identifyUserOrGuest };


// const jwt = require('jsonwebtoken');
// const { prisma } = require('../config/db');

// // const protect = async (req, res, next) => {
// //     let token;

// //     // 1. Check Header: Kya "Bearer" token maujood hai?
// //     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
// //         try {
// //             // Token nikalo (Bearer word hata kar)
// //             token = req.headers.authorization.split(' ')[1];

// //             // 2. Token Verify Karo
// //             const decoded = jwt.verify(token, process.env.JWT_SECRET);

// //             // 3. User dhoondo Database mein (Password chupa kar)
// //             // Hum ye bhi check karenge ke user "Deleted" to nahi hai
// //             req.user = await prisma.user.findFirst({
// //                 where: { 
// //                     user_id: decoded.id,
// //                     deleted_at: null // Sirf Active users
// //                 },
// //                 select: {
// //                     user_id: true,
// //                     first_name: true,
// //                     last_name: true,
// //                     email: true,
// //                     role: true
// //                 }
// //             });

// //             if (!req.user) {
// //                 return res.status(401).json({ success: false, message: "User not found or deactivated" });
// //             }

// //             next(); // Sab theek hai, Controller ke paas jao

// //         } catch (error) {
// //             console.error(error);
// //             res.status(401).json({ success: false, message: "Not authorized, token failed" });
// //         }
// //     }

// //     if (!token) {
// //         res.status(401).json({ success: false, message: "Not authorized, no token" });
// //     }
// // };

// const protect = async (req, res, next) => {
//     let token;

//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//         try {
//             // Token nikalo
//             token = req.headers.authorization.split(' ')[1];

//             // Token Verify Karo
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             // User dhoondo (Deleted users ko ignore karo)
//             const user = await prisma.user.findFirst({
//                 where: { 
//                     user_id: decoded.id,
//                     deleted_at: null // Sirf Active users
//                 },
//                 select: {
//                     user_id: true,
//                     first_name: true,
//                     last_name: true,
//                     email: true,
//                     role: true // 👈 Ye zaroori hai agle middleware ke liye
//                 }
//             });

//             if (!user) {
//                 return res.status(401).json({ success: false, message: "User not found or deactivated" });
//             }

//             // User ko request object mein daal do taaki agle function ko mile
//             req.user = user;
            
//             return next(); // Return lagana behtar hai taaki code yahi ruk jaye

//         } catch (error) {
//             console.error("Auth Error:", error.message);
//             return res.status(401).json({ success: false, message: "Not authorized, token failed" });
//         }
//     }

//     if (!token) {
//         return res.status(401).json({ success: false, message: "Not authorized, no token" });
//     }
// };

// // ==========================================
// // 2. AUTHORIZE (Authorization - Role Check)
// // ==========================================
// // Isay aise call karenge: authorize('Administrator', 'Inventory_Manager')
// const authorize = (...allowedRoles) => {
//     return (req, res, next) => {
//         // Pehle check karo ke 'protect' middleware chala tha ya nahi (req.user hona chahiye)
//         if (!req.user) {
//             return res.status(401).json({ success: false, message: "User verification failed" });
//         }

//         // Check karo ke User ka Role allowed list mein hai ya nahi
//         if (!allowedRoles.includes(req.user.role)) {
//             return res.status(403).json({ 
//                 success: false, 
//                 message: `Access Denied: ${req.user.role}s are not allowed to access this resource.` 
//             });
//         }

//         next(); // Sab sahi hai, aage badho
//     };
// };


// // Add this new function to your existing authMiddleware.js

// const identifyUserOrGuest = async (req, res, next) => {
//     let token;
  
//     // 1. Check for Token (Registered User)
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//       try {
//         token = req.headers.authorization.split(' ')[1];
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = await prisma.user.findUnique({ where: { user_id: decoded.user_id } });
//       } catch (error) {
//         console.log("Token invalid, treating as Guest");
//       }
//     }
  
//     // 2. Check for Guest ID (Frontend se aayega)
//     // Guest ID frontend generate karega (UUID) aur body/headers mein bhejega
//     const guestId = req.headers['x-guest-id'] || req.body?.guestId;
  
//     if (!req.user && !guestId) {
//       return res.status(401).json({ success: false, message: "Identification required (Token or Guest ID)" });
//     }
  
//     // Request object mein guestId set kardo taake controller use kar sake
//     req.guestId = guestId;
//     next();
//   };
  

// module.exports = { protect , authorize, identifyUserOrGuest};