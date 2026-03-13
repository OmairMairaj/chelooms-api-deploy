const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SearchService {
    async globalSiteSearch(searchQuery) {
        // Agar user ne khali search hit ki hai, toh empty arrays bhej do
        if (!searchQuery || searchQuery.trim() === "") {
            return { fabrics: [], embellishments: [], designs: [] };
        }

        const q = searchQuery.trim();

        // Database Query: Sirf ACTIVE items dhoondo jinke naam, SKU, ya color mein search word ho
        const items = await prisma.inventoryItem.findMany({
            where: {
                isActive: true, // 🚨 The Golden Rule: Chhupe hue items site par nahi jayenge
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } },
                    { colorName: { contains: q, mode: 'insensitive' } }
                ]
            },
            include: {
                category: { select: { type: true, name: true } }
            },
            take: 15 // ⚡ Performance Boost: Dropdown mein max 15 results hi achay lagte hain
        });

        // Ab in results ko Categories ke hisaab se alag alag buckets (arrays) mein daal do
        const fabrics = [];
        const embellishments = [];
        
        items.forEach(item => {
            // Frontend dropdown ke liye sirf zaroori data bhejo (Poora kachra nahi)
            const formattedItem = {
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: item.price,
                stockQuantity: item.stockQuantity, // Frontend isko dekh kar "Out of Stock" dikhayega
                image: item.images?.thumbnail || null, // Sirf choti picture bhejo
                categoryName: item.category.name
            };

            if (item.category.type === 'FABRIC') {
                fabrics.push(formattedItem);
            } else if (item.category.type === 'EMBELLISHMENT') {
                embellishments.push(formattedItem);
            }
        });

        // Designs abhi ready nahi hain, toh usko empty array rakha hai 
        // Frontend apna UI abhi se iske hisaab se bana lega
        const designs = [];

        return { fabrics, embellishments, designs };
    }
}

module.exports = new SearchService();