const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    // 1. Check Header: Kya "Bearer" token maujood hai?
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Token nikalo (Bearer word hata kar)
            token = req.headers.authorization.split(' ')[1];

            // 2. Token Verify Karo
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. User dhoondo Database mein (Password chupa kar)
            // Hum ye bhi check karenge ke user "Deleted" to nahi hai
            req.user = await prisma.user.findFirst({
                where: { 
                    user_id: decoded.id,
                    deleted_at: null // Sirf Active users
                },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true
                }
            });

            if (!req.user) {
                return res.status(401).json({ success: false, message: "User not found or deactivated" });
            }

            next(); // Sab theek hai, Controller ke paas jao

        } catch (error) {
            console.error(error);
            res.status(401).json({ success: false, message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
};

module.exports = { protect };