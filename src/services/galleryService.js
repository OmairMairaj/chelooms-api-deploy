const { prisma } = require('../config/db'); // Apne db path ke hisaab se check kar lena

class GalleryService {
  normalizeTags(rawTags) {
    if (!Array.isArray(rawTags)) return [];
    return [...new Set(rawTags
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(Boolean)
      .map((tag) => tag.toLowerCase().replace(/\s+/g, '-')))];
  }

  parseCsvList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap((v) => this.parseCsvList(v));
    return String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async getFabricFacets() {
    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        stockQuantity: { gt: 0 },
        category: { type: 'FABRIC' },
      },
      select: {
        material: true,
        tags: true,
        metadata: true,
        colorName: true,
        fabricProfile: {
          select: {
            fabricType: true,
            isPremium: true,
          },
        },
      },
    });

    const tagCounts = new Map();
    const materialCounts = new Map();
    const fabricTypeCounts = new Map();
    const colorCounts = new Map();
    let premiumCount = 0;

    items.forEach((item) => {
      if (item.fabricProfile?.isPremium) premiumCount += 1;
      if (item.material) {
        const key = item.material.trim();
        materialCounts.set(key, (materialCounts.get(key) || 0) + 1);
      }
      if (item.fabricProfile?.fabricType) {
        const key = item.fabricProfile.fabricType.trim();
        fabricTypeCounts.set(key, (fabricTypeCounts.get(key) || 0) + 1);
      }
      if (item.colorName) {
        const key = item.colorName.trim();
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }
      this.normalizeTags(item.tags).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
      const metadataTags = this.normalizeTags(item.metadata?.tags);
      metadataTags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const tags = [...tagCounts.entries()]
      .map(([slug, count]) => ({ slug, label: slug.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const toFacetList = (source) => [...source.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    return {
      tags,
      materials: toFacetList(materialCounts),
      fabricTypes: toFacetList(fabricTypeCounts),
      colors: toFacetList(colorCounts),
      premiumCount,
    };
  }

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
    if (filters.type) {
      whereClause.category = { ...(whereClause.category || {}), type: String(filters.type).toUpperCase() };
    }

    if (filters.q) {
      const query = String(filters.q).trim();
      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { colorName: { contains: query, mode: 'insensitive' } },
          { material: { contains: query, mode: 'insensitive' } },
          {
            fabricProfile: {
              is: {
                fabricType: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ];
      }
    }

    const normalizedTags = this.normalizeTags(this.parseCsvList(filters.tags));
    if (normalizedTags.length > 0) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { tags: { hasSome: normalizedTags } },
        {
          metadata: {
            path: ['tags'],
            array_contains: normalizedTags,
          },
        },
      ];
    }

    if (filters.material) {
      whereClause.material = { contains: String(filters.material), mode: 'insensitive' };
    }

    if (filters.fabricType || filters.isPremium !== undefined) {
      whereClause.fabricProfile = { is: {} };
      if (filters.fabricType) {
        whereClause.fabricProfile.is.fabricType = {
          contains: String(filters.fabricType),
          mode: 'insensitive',
        };
      }
      if (filters.isPremium !== undefined) {
        whereClause.fabricProfile.is.isPremium = filters.isPremium === true || filters.isPremium === 'true';
      }
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
          material: true,
          tags: true,
          metadata: true,
          price: true,
          images: true, // Cloudinary URLs yahan aayengi
          colorName: true,
          colorHex: true,
          stockQuantity: true,
          lowStockThreshold: true,
          fabricProfile: {
            select: {
              fabricType: true,
              isPremium: true,
              premiumPrice: true,
            },
          },
          category: {
            select: { id: true, name: true, type: true, slug: true }
          }
        },
        orderBy: orderByClause // Ab hardcoded nahi, dynamic hai!
      }),
      prisma.inventoryItem.count({ where: whereClause })
    ]);

    const hydratedItems = items.map((item) => {
      const normalizedTagsFromDb = this.normalizeTags(item.tags);
      const normalizedTagsFromMeta = this.normalizeTags(item.metadata?.tags);
      const materialTag = item.material ? this.normalizeTags([item.material]) : [];
      const fabricTypeTag = item.fabricProfile?.fabricType ? this.normalizeTags([item.fabricProfile.fabricType]) : [];
      const premiumTag = item.fabricProfile?.isPremium ? ['premium'] : [];
      const tags = [...new Set([
        ...normalizedTagsFromDb,
        ...normalizedTagsFromMeta,
        ...materialTag,
        ...fabricTypeTag,
        ...premiumTag,
      ])];
      return { ...item, tags };
    });

    return {
      items: hydratedItems,
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