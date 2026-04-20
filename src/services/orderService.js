const { prisma } = require('../config/db');

const getMyOrderHistory = async (userId, queryParams) => {
    // Pagination parameters
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    // Sirf wo orders dhoondo jo user ne waqai place kar diye hain (Draft/Cart wale nahi)
    const whereClause = {
        user_id: userId,
        operationalStatus: {
            not: 'checkout_draft' // 👈 E-commerce Logic: Cart wale items history mein nahi aayenge
        }
    };

    // Parallel execution for faster response
    const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
            where: whereClause,
            skip: skip,
            take: limit,
            orderBy: { createdAt: 'desc' }, // Latest order sabse upar
            include: {
                items: {
                    select: {
                        id: true,
                        itemType: true,
                        nameAtPurchase: true,
                        quantity: true,
                        unitPrice: true,
                        totalLinePrice: true,
                        attributes: true
                    }
                }
            }
        }),
        prisma.order.count({ where: whereClause })
    ]);

    return {
        orders,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Admin panel: paginated list of orders (optionally includes cart drafts).
 * Query: page, limit, status (OperationalStatus), paymentStatus, search (readableId / guestId), includeDrafts
 */
const getAdminOrdersList = async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const includeDrafts =
        queryParams.includeDrafts === 'true' || queryParams.includeDrafts === '1';

    const where = {};

    if (queryParams.status) {
        where.operationalStatus = queryParams.status;
    } else if (!includeDrafts) {
        where.operationalStatus = { not: 'checkout_draft' };
    }

    if (queryParams.paymentStatus) {
        where.paymentStatus = queryParams.paymentStatus;
    }

    if (queryParams.search && String(queryParams.search).trim()) {
        const s = String(queryParams.search).trim();
        where.OR = [
            { readableId: { contains: s, mode: 'insensitive' } },
            { guestId: { contains: s, mode: 'insensitive' } },
        ];
    }

    const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        mobile_number: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        itemType: true,
                        nameAtPurchase: true,
                        quantity: true,
                        unitPrice: true,
                        totalLinePrice: true,
                        attributes: true,
                    },
                },
                _count: { select: { items: true, timelineEvents: true } },
            },
        }),
        prisma.order.count({ where }),
    ]);

    return {
        orders,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        },
    };
};

module.exports = {
    getMyOrderHistory,
    getAdminOrdersList,
};