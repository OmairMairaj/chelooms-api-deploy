const { prisma } = require('../config/db');

const OPEN_ORDER_EXCLUDE = [
    'checkout_draft',
    'checkout_abandoned',
    'delivered',
    'cancelled',
    'returned',
];

/**
 * Single round-trip style dashboard for admin home (all counts the panel cares about).
 */
const getAdminDashboardStats = async () => {
    const [
        users,
        ordersPlaced,
        ordersCartDrafts,
        ordersOpen,
        revenueAgg,
        inventoryItems,
        inventoryCategories,
        savedDesigns,
        standardSizes,
        necklineOptions,
        sleeveOptions,
        hemlineOptions,
        sideSlits,
        embellishmentOptions,
        buttonOptions,
        productCategories,
        designProducts,
    ] = await Promise.all([
        prisma.user.count({ where: { deleted_at: null } }),
        prisma.order.count({ where: { operationalStatus: { not: 'checkout_draft' } } }),
        prisma.order.count({ where: { operationalStatus: 'checkout_draft' } }),
        prisma.order.count({
            where: { operationalStatus: { notIn: OPEN_ORDER_EXCLUDE } },
        }),
        prisma.order.aggregate({
            where: { operationalStatus: { not: 'checkout_draft' } },
            _sum: { totalAmount: true },
        }),
        prisma.inventoryItem.count(),
        prisma.inventoryCategory.count(),
        prisma.savedDesign.count(),
        prisma.standardSize.count(),
        prisma.necklineOption.count(),
        prisma.sleeveOption.count(),
        prisma.hemlineOption.count(),
        prisma.sideSlit.count(),
        prisma.embellishmentOption.count(),
        prisma.buttonOption.count(),
        prisma.productCategory.count(),
        prisma.product.count({ where: { deletedAt: null } }),
    ]);

    const raw = revenueAgg._sum.totalAmount;
    const revenueTotal = raw != null ? Number(raw) : 0;

    return {
        users,
        ordersPlaced,
        ordersCartDrafts,
        ordersOpen,
        revenueTotal,
        inventoryItems,
        inventoryCategories,
        savedDesigns,
        standardSizes,
        designTool: {
            necklineOptions,
            sleeveOptions,
            hemlineOptions,
            sideSlits,
            embellishmentOptions,
            buttonOptions,
            productCategories,
            designProducts,
        },
    };
};

module.exports = {
    getAdminDashboardStats,
};
