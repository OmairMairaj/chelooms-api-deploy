const { prisma } = require('../config/db');

const logAuthEvent = async ({ identifier, attemptType, status, failureReason, ipAddress, userAgent }) => {
    try {
        await prisma.authAuditLog.create({
            data: {
                identifier: identifier || "Unknown",
                attempt_type: attemptType, // 'login', 'register', etc.
                status: status,            // 'success', 'failed', 'blocked'
                failure_reason: failureReason,
                ip_address: ipAddress,
                user_agent: userAgent
            }
        });
    } catch (error) {
        // Audit log fail hone par hum system nahi rokenge, bas console mein error dikhayenge
        console.error("⚠️ Audit Log Failed:", error.message);
    }
};

module.exports = { logAuthEvent };