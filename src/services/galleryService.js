const { prisma } = require('../config/db'); // Apne db path ke hisaab se check kar lena

class GalleryService {
  // Filters, Page aur Limit accept karega
  async getDisplayItems(filters, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    
    // Dynamic Where Clause Banana
    const whereClause = {
      // Rule 1: Customer ko wahi dikhao jo actually stock mein ho
      stockQuantity: { gt: 0 },
      // Rule 2: (The Golden Rule) Sirf wo dikhao jo Admin ne active rakha hai
      isActive: true 
    };

    if (filters.categoryId) {
      whereClause.categoryId = parseInt(filters.categoryId);
    }

    if (filters.color) {
      whereClause.colorName = { 
        contains: filters.color, 
        mode: 'insensitive' // case-insensitive search (red == RED)
      };
    }

    if (filters.minPrice || filters.maxPrice) {
      whereClause.price = {};
      if (filters.minPrice) whereClause.price.gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) whereClause.price.lte = parseFloat(filters.maxPrice);
    }

    // ==========================================
    // 🚀 DYNAMIC SORTING LOGIC START
    // ==========================================
    let orderByClause = { createdAt: 'desc' }; // Default: Newest pehle aayega

    if (filters.sort) {
      switch (filters.sort) {
        case 'price_desc': // Price: High to Low
          orderByClause = { price: 'desc' };
          break;
        case 'price_asc':  // Price: Low to High
          orderByClause = { price: 'asc' };
          break;
        case 'newest':     // Newest
          orderByClause = { createdAt: 'desc' };
          break;
        // 'trending' ko abhi ignore kiya hai jaisa aapne kaha tha
        default:
          orderByClause = { createdAt: 'desc' };
      }
    }
    // ==========================================
    // DYNAMIC SORTING LOGIC END
    // ==========================================

    // Database Query: Data aur Total Count dono ek sath nikalna
    const [items, totalCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        // DHYAN DEIN: Hum yahan selectively data bhej rahe hain
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true, // Cloudinary URLs yahan aayengi
          colorName: true,
          colorHex: true,
          stockQuantity: true,
          lowStockThreshold: true,
          category: {
            select: { name: true }
          }
        },
        orderBy: orderByClause // Ab hardcoded nahi, dynamic hai!
      }),
      prisma.inventoryItem.count({ where: whereClause })
    ]);

    return {
      items,
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        itemsPerPage: limit
      }
    };
  }
}

module.exports = new GalleryService();



// const { prisma } = require('../config/db');

// class GalleryService {
//   // Filters, Page aur Limit accept karega
//   async getDisplayItems(filters, page = 1, limit = 12) {
//     const skip = (page - 1) * limit;
    
//     // Dynamic Where Clause Banana (Jo filter aayega, wo add hoga)
//     const whereClause = {
//       // Rule: Customer ko wahi dikhao jo actually stock mein ho
//       stockQuantity: { gt: 0 } 
//     };

//     if (filters.categoryId) {
//       whereClause.categoryId = parseInt(filters.categoryId);
//     }

//     if (filters.color) {
//       whereClause.colorName = { 
//         contains: filters.color, 
//         mode: 'insensitive' // case-insensitive search (red == RED)
//       };
//     }

//     if (filters.minPrice || filters.maxPrice) {
//       whereClause.price = {};
//       if (filters.minPrice) whereClause.price.gte = parseFloat(filters.minPrice);
//       if (filters.maxPrice) whereClause.price.lte = parseFloat(filters.maxPrice);
//     }

//     // Database Query: Data aur Total Count dono ek sath nikalna
//     const [items, totalCount] = await Promise.all([
//       prisma.inventoryItem.findMany({
//         where: whereClause,
//         skip: skip,
//         take: limit,
//         // DHYAN DEIN: Hum yahan selectively data bhej rahe hain (Audit logs ya hidden info nahi)
//         select: {
//           id: true,
//           name: true,
//           description: true,
//           price: true,
//           images: true, // Cloudinary URLs yahan aayengi
//           colorName: true,
//           colorHex: true,
//           stockQuantity: true,
//           lowStockThreshold: true,
//           category: {
//             select: { name: true }
//           }
//         },
//         orderBy: { createdAt: 'desc' } // Naye items pehle dikhayen
//       }),
//       prisma.inventoryItem.count({ where: whereClause })
//     ]);

//     return {
//       items,
//       pagination: {
//         totalItems: totalCount,
//         currentPage: page,
//         totalPages: Math.ceil(totalCount / limit),
//         itemsPerPage: limit
//       }
//     };
//   }
// }

// module.exports = new GalleryService();