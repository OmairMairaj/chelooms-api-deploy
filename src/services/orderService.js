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

module.exports = {
    // baki functions...
    getMyOrderHistory
};