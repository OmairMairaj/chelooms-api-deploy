const { prisma } = require('../config/db');

const RESULT_LIMIT = 15;

class SearchService {
    async globalSiteSearch(searchQuery) {
        if (!searchQuery || searchQuery.trim() === "") {
            return { fabrics: [], embellishments: [], designs: [] };
        }

        const q = searchQuery.trim();

        const [items, designRows] = await Promise.all([
            prisma.inventoryItem.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } },
                        { colorName: { contains: q, mode: 'insensitive' } },
                    ],
                },
                include: {
                    category: { select: { type: true, name: true } },
                },
                take: RESULT_LIMIT,
            }),
            prisma.savedDesign.findMany({
                where: {
                    status: 'published',
                    OR: [
                        { designName: { contains: q, mode: 'insensitive' } },
                        { product: { name: { contains: q, mode: 'insensitive' } } },
                    ],
                },
                select: {
                    saveDesignId: true,
                    designName: true,
                    thumbnailUrl: true,
                    finalPrice: true,
                    currency: true,
                    viewsCount: true,
                    likesCount: true,
                    product: { select: { id: true, name: true, pieceType: true } },
                    user: {
                        select: {
                            first_name: true,
                            last_name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: RESULT_LIMIT,
            }),
        ]);

        const fabrics = [];
        const embellishments = [];

        items.forEach((item) => {
            const formattedItem = {
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: item.price,
                stockQuantity: item.stockQuantity,
                image: item.images?.thumbnail || null,
                categoryName: item.category.name,
            };

            if (item.category.type === 'FABRIC') {
                fabrics.push(formattedItem);
            } else if (item.category.type === 'EMBELLISHMENT') {
                embellishments.push(formattedItem);
            }
        });

        const designs = designRows.map((d) => ({
            id: d.saveDesignId,
            name: d.designName,
            thumbnailUrl: d.thumbnailUrl,
            price: d.finalPrice,
            currency: d.currency || 'PKR',
            viewsCount: d.viewsCount,
            likesCount: d.likesCount,
            productId: d.product?.id,
            productName: d.product?.name,
            pieceType: d.product?.pieceType,
            authorName: [d.user?.first_name, d.user?.last_name].filter(Boolean).join(' ').trim() || null,
        }));

        return { fabrics, embellishments, designs };
    }
}

module.exports = new SearchService();