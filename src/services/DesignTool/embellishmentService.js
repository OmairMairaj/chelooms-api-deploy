const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EmbellishmentService {

  // ==========================================
  // 📁 CATEGORY APIs (Parent)
  // ==========================================

  async createCategory(data) {
    return await prisma.embellishmentCategory.create({
      data: {
        frontendId: data.frontendId || `emb-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        image: data.image || []
      }
    });
  }

  // Dropdown ke liye simple list
  async getAllCategories() {
    return await prisma.embellishmentCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateCategory(id, updateData) {
    const dataToUpdate = {};
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;

    return await prisma.embellishmentCategory.update({
      where: { categoryId: id },
      data: dataToUpdate
    });
  }

  // ==========================================
  // ✨ OPTION APIs (Child)
  // ==========================================

  async createOption(data) {
    return await prisma.embellishmentOption.create({
      data: {
        categoryId: data.categoryId,
        frontendId: data.frontendId || `emb-opt-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        inventoryItemId: data.inventoryItemId || null,
        name: data.name,
        images: data.images || [],
        premium: data.premium || false,
        premiumPrice: data.premiumPrice || 0,
        keywords: data.keywords || [],
        tags: data.tags || [],
        allowedNecklines: data.allowedNecklines || [],
        allowedHemlines: data.allowedHemlines || [],
        allowedSleeves: data.allowedSleeves || [],
        colors: data.colors || [], // JSON Array
        overlays: data.overlays || {} // 🐙 The nested magic JSON
      }
    });
  }

  async updateOption(id, updateData) {
    const dataToUpdate = {};
    
    // Sirf wahi fields update karo jo frontend se aayi hain
    const fields = [
      'frontendId', 'name', 'images', 'premium', 'premiumPrice', 
      'keywords', 'tags', 'allowedNecklines', 'allowedHemlines', 
      'allowedSleeves', 'colors', 'overlays', 'inventoryItemId'
    ];

    fields.forEach(field => {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    });

    return await prisma.embellishmentOption.update({
      where: { optionId: id },
      data: dataToUpdate
    });
  }

  // ==========================================
  // 🪄 THE MAGIC API (Grouped Data for Frontend)
  // ==========================================

  async getAllEmbellishmentsGrouped() {
    const categories = await prisma.embellishmentCategory.findMany({
      include: {
        options: {
          orderBy: { createdAt: 'asc' } // Options ko tarteeb se lane ke liye
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Frontend ke JSON structure se exact match karne ke liye mapping
    return categories.map(cat => ({
      dbId: cat.categoryId,
      id: cat.frontendId,
      name: cat.name,
      image: cat.image,
      options: cat.options.map(opt => ({
        dbId: opt.optionId,
        id: opt.frontendId,
        name: opt.name,
        images: opt.images,
        premium: opt.premium,
        premium_price: opt.premiumPrice, // Snake case for frontend matching
        keywords: opt.keywords,
        tags: opt.tags,
        allowedNecklines: opt.allowedNecklines,
        allowedHemlines: opt.allowedHemlines,
        allowedSleeves: opt.allowedSleeves,
        colors: opt.colors,
        overlays: opt.overlays,
        inventoryItemId: opt.inventoryItemId
      }))
    }));
  }
}

module.exports = new EmbellishmentService();