const { prisma } = require('../config/db');

const OPERATIONAL_STATUS_VALUES = new Set([
    'checkout_draft',
    'checkout_abandoned',
    'pending_payment',
    'paid_processing',
    'in_production',
    'quality_check',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
]);

const PAYMENT_STATUS_VALUES = new Set(['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded']);

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

const enrichOrderItemsWithSizing = async (items = []) => {
    const standardSizeIds = (items || [])
        .map((item) => item?.attributes?.standardSizeId)
        .filter((id) => Number.isInteger(id));
    const uniqueStandardSizeIds = [...new Set(standardSizeIds)];
    const standardSizes = uniqueStandardSizeIds.length
        ? await prisma.standardSize.findMany({
            where: { id: { in: uniqueStandardSizeIds } },
            select: {
                id: true,
                sizeCode: true,
                label: true,
                measurements: true,
                recommendations: true,
            },
        })
        : [];
    const standardSizeById = new Map(standardSizes.map((s) => [s.id, s]));

    const enrichSizing = (attributes) => {
        if (!attributes || typeof attributes !== 'object' || !attributes.method) return null;
        const standard = attributes.standardSizeId
            ? standardSizeById.get(attributes.standardSizeId) || null
            : null;
        return {
            method: attributes.method,
            profileNickname: attributes.profileNickname || null,
            standardSizeId: attributes.standardSizeId || null,
            sizeCode: attributes.sizeCode || standard?.sizeCode || null,
            sizeLabel: attributes.sizeLabel || standard?.label || null,
            measurements:
                attributes.method === 'Jute_Fit_Custom'
                    ? attributes.customMeasurements || null
                    : standard?.measurements || null,
            recommendations: standard?.recommendations || null,
        };
    };

    return (items || []).map((item) => ({
        id: item.id,
        itemType: item.itemType,
        inventoryItemId: item.inventoryItemId,
        designId: item.designId,
        nameAtPurchase: item.nameAtPurchase,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalLinePrice: item.totalLinePrice,
        attributes: item.attributes || null,
        sizing: enrichSizing(item.attributes || null),
        inventoryItem: item.inventoryItem || null,
    }));
};

/** Customer: single order detail owned by logged-in user */
const getMyOrderById = async (userId, orderId) => {
    const order = await prisma.order.findFirst({
        where: {
            user_id: userId,
            operationalStatus: { not: 'checkout_draft' },
            OR: [
                { id: orderId },
                { readableId: orderId },
            ],
        },
        include: {
            items: {
                include: {
                    inventoryItem: {
                        select: {
                            id: true,
                            name: true,
                            colorName: true,
                            images: true,
                        },
                    },
                },
                orderBy: { id: 'asc' },
            },
            timelineEvents: { orderBy: { createdAt: 'desc' } },
        },
    });

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    const items = await enrichOrderItemsWithSizing(order.items || []);
    return { ...order, items };
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

/** Admin panel: single order detail with timeline + enriched item sizing context */
const getAdminOrderById = async (orderId) => {
    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { id: orderId },
                { readableId: orderId },
            ],
        },
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
                include: {
                    inventoryItem: {
                        select: {
                            id: true,
                            name: true,
                            colorName: true,
                            images: true,
                        },
                    },
                },
                orderBy: { id: 'asc' },
            },
            timelineEvents: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    const items = await enrichOrderItemsWithSizing(order.items || []);

    return { ...order, items };
};

/**
 * Admin: update operational and/or payment status. Creates timeline entries when something changes.
 */
const updateAdminOrderStatus = async (orderId, { operationalStatus, paymentStatus }, actor = null) => {
    const hasOp = operationalStatus !== undefined;
    const hasPay = paymentStatus !== undefined;
    if (!hasOp && !hasPay) {
        const err = new Error('Provide at least one of operationalStatus or paymentStatus');
        err.statusCode = 400;
        throw err;
    }

    if (hasOp && !OPERATIONAL_STATUS_VALUES.has(operationalStatus)) {
        const err = new Error('Invalid operationalStatus');
        err.statusCode = 400;
        throw err;
    }
    if (hasPay && !PAYMENT_STATUS_VALUES.has(paymentStatus)) {
        const err = new Error('Invalid paymentStatus');
        err.statusCode = 400;
        throw err;
    }

    const order = await prisma.order.findFirst({
        where: { OR: [{ id: orderId }, { readableId: orderId }] },
    });

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    const actorName = actor
        ? [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim() || actor.email || 'Admin'
        : 'Admin';

    const data = {};
    if (hasOp) data.operationalStatus = operationalStatus;
    if (hasPay) data.paymentStatus = paymentStatus;

    const opChanged = hasOp && order.operationalStatus !== operationalStatus;
    const payChanged = hasPay && order.paymentStatus !== paymentStatus;

    if (!opChanged && !payChanged) {
        return getAdminOrderById(order.id);
    }

    const timelineCreates = [];
    if (opChanged) {
        timelineCreates.push({
            orderId: order.id,
            statusFrom: order.operationalStatus,
            statusTo: operationalStatus,
            description: 'Operational status updated',
            actorName,
        });
    }
    if (payChanged) {
        timelineCreates.push({
            orderId: order.id,
            statusFrom: null,
            statusTo: null,
            description: `Payment status: ${order.paymentStatus} → ${paymentStatus}`,
            actorName,
        });
    }

    await prisma.$transaction([
        prisma.order.update({
            where: { id: order.id },
            data,
        }),
        ...timelineCreates.map((row) => prisma.orderTimeline.create({ data: row })),
    ]);

    return getAdminOrderById(order.id);
};

module.exports = {
    getMyOrderHistory,
    getMyOrderById,
    getAdminOrdersList,
    getAdminOrderById,
    updateAdminOrderStatus,
};