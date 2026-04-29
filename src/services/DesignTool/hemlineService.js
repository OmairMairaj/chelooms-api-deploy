const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class HemlineService {
  
  // ==========================================
  // 📁 CATEGORY METHODS (Parent)
  // ==========================================

  // 1. Create a new Category
  async createCategory(data) {
    return await prisma.hemlineCategory.create({
      data: {
        frontendId: data.frontendId || `hl-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        image: data.image || [] 
      }
    });
  }

  // 2. Get All Categories (Dropdown ke liye)
  async getAllCategories() {
    return await prisma.hemlineCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });
  }

  // ==========================================
  // REORDER CATEGORIES
  // ==========================================
  async reorderCategories(orderedIds) {
    return await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        const category = await tx.hemlineCategory.findFirst({
          where: {
            OR: [{ categoryId: id }, { frontendId: id }]
          },
          select: { categoryId: true }
        });
        if (!category) continue;
        await tx.hemlineCategory.update({
          where: { categoryId: category.categoryId },
          data: { sortOrder: index }
        });
      }
    });
  }

  // ==========================================
  // REORDER OPTIONS
  // ==========================================
  async reorderOptions(orderedIds) {
    return await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        const option = await tx.hemlineOption.findFirst({
          where: {
            OR: [{ optionId: id }, { frontendId: id }]
          },
          select: { optionId: true }
        });
        if (!option) continue;
        await tx.hemlineOption.update({
          where: { optionId: option.optionId },
          data: { sortOrder: index }
        });
      }
    });
  }

  // 3. Update a Category
  async updateCategory(categoryId, updateData) {
    const dataToUpdate = {};
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;

    return await prisma.hemlineCategory.update({
      where: { categoryId: categoryId },
      data: dataToUpdate
    });
  }

  // ==========================================
  // 👕 OPTION METHODS (Child)
  // ==========================================

  // 4. Create a new Option
  async createOption(data) {
    return await prisma.hemlineOption.create({
      data: {
        categoryId: data.categoryId, 
        frontendId: data.frontendId || null,
        name: data.name,
        shapeTag: data.shapeTag || null, // 👈 Nayi field
        
        // Removed images & keywords from here
        image: data.image || [],
        tags: data.tags || [],
        layers: data.layers || [], // Cloudinary URLs controller se set ho kar yahan aayenge
        
        isPremium: data.premium || false, 
        premiumPrice: data.premium_price ? parseFloat(data.premium_price) : null
      }
    });
  }

  // 5. Update an Option
  async updateOption(optionId, updateData) {
    const dataToUpdate = {};
    
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.shapeTag !== undefined) dataToUpdate.shapeTag = updateData.shapeTag;
    
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;
    if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
    if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
    
    if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
    if (updateData.premium_price !== undefined) {
      dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
    }

    return await prisma.hemlineOption.update({
      where: { optionId: optionId },
      data: dataToUpdate
    });
  }

  // ==========================================
  // 🪄 THE MAGIC GETTER (For Frontend List)
  // ==========================================

  // 6. Get All Hemlines Grouped
  async getAllHemlinesGrouped() {
    const categories = await prisma.hemlineCategory.findMany({
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Frontend ke JSON format mein map karna (With dbIds)
    return categories.map(cat => ({
      dbId: cat.categoryId, // UUID for updating category
      id: cat.frontendId,
      name: cat.name,
      image: cat.image,
      options: cat.options.map(opt => ({
        dbId: opt.optionId, // UUID for updating option
        id: opt.frontendId,
        name: opt.name,
        shapeTag: opt.shapeTag, // 👈 Frontend ko shapeTag zaroor chahiye tha
        
        image: opt.image,
        tags: opt.tags,
        layers: opt.layers,
        premium: opt.isPremium,
        premium_price: opt.premiumPrice
      }))
    }));
  }
}

module.exports = new HemlineService();