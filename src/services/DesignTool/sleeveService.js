const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SleeveService {
  
  // ==========================================
  // 📁 CATEGORY METHODS (Parent)
  // ==========================================

  // 1. Create a new Category
  async createCategory(data) {
    return await prisma.sleeveCategory.create({
      data: {
        frontendId: data.frontendId || `cat-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        image: data.image || [] // Array of Cloudinary URLs
      }
    });
  }

  async updateCategory(categoryId, updateData) {
    const dataToUpdate = {};
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;

    return await prisma.sleeveCategory.update({
      where: { categoryId: categoryId },
      data: dataToUpdate
    });
  }

  // 2. Get All Categories (Sirf Dropdown ke liye form mein)
  async getAllCategories() {
    return await prisma.sleeveCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });
  }

  // ==========================================
  // REORDER CATEGORIES
  // ==========================================
  async reorderCategories(orderedIds) {
    const transaction = orderedIds.map((id, index) => {
      return prisma.sleeveCategory.update({
        where: { categoryId: id },
        data: { sortOrder: index }
      });
    });
    return await prisma.$transaction(transaction);
  }

  // ==========================================
  // REORDER OPTIONS
  // ==========================================
  async reorderOptions(orderedIds) {
    const transaction = orderedIds.map((id, index) => {
      return prisma.sleeveOption.update({
        where: { optionId: id },
        data: { sortOrder: index }
      });
    });
    return await prisma.$transaction(transaction);
  }

  // ==========================================
  // 👕 OPTION METHODS (Child)
  // ==========================================

  // 3. Create a new Option
  // async createOption(data) {
  //   return await prisma.sleeveOption.create({
  //     data: {
  //       categoryId: data.categoryId, // Dropdown se aayegi
  //       frontendId: data.frontendId || null,
  //       name: data.name,
  //       hasButtons: data.hasButtons || false,
        
  //       images: data.images || [], // Array of Cloudinary URLs
  //       keywords: data.keywords || [],
  //       tags: data.tags || [],
  //       layers: data.layers || [], 
        
  //       isPremium: data.premium || false, 
  //       premiumPrice: data.premium_price ? parseFloat(data.premium_price) : null
  //     }
  //   });
  // }

  // // 4. Update an Option
  // async updateOption(optionId, updateData) {
  //   const dataToUpdate = {};
    
  //   if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
  //   if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
  //   if (updateData.hasButtons !== undefined) dataToUpdate.hasButtons = updateData.hasButtons;
    
  //   if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
  //   if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
  //   if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
  //   if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
    
  //   if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
  //   if (updateData.premium_price !== undefined) {
  //     dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
  //   }

  //   return await prisma.sleeveOption.update({
  //     where: { optionId: optionId },
  //     data: dataToUpdate
  //   });
  // }

  async createOption(data) {
    try {
      console.log("⚙️ [SERVICE] Attempting to create Sleeve Option in DB...");
      const result = await prisma.sleeveOption.create({
        data: {
          categoryId: data.categoryId, 
          frontendId: data.frontendId || null,
          name: data.name,
          hasButtons: data.hasButtons || false,
          
          images: data.images || [], 
          keywords: data.keywords || [],
          tags: data.tags || [],
          layers: data.layers || [], 
          
          isPremium: data.premium || false, 
          premiumPrice: data.premiumPrice ? parseFloat(data.premiumPrice) : null
        }
      });
      console.log("⚙️ [SERVICE] DB Create Successful!");
      return result;
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN SLEEVE CREATE:");
      console.error(dbError);
      throw new Error(`DB Create Error: ${dbError.message}`);
    }
  }

  async updateOption(optionId, updateData) {
    try {
      console.log(`⚙️ [SERVICE] Formatting update data for Sleeve Option DB...`);
      const dataToUpdate = {};
      
      if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.hasButtons !== undefined) dataToUpdate.hasButtons = updateData.hasButtons;
      
      if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
      if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
      if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
      if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
      
      if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
      if (updateData.premium_price !== undefined) {
        dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
      }

      console.log(`⚙️ [SERVICE] Attempting to update DB...`);
      const result = await prisma.sleeveOption.update({
        where: { optionId: optionId },
        data: dataToUpdate
      });
      
      console.log("⚙️ [SERVICE] DB Update Successful!");
      return result;
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN SLEEVE UPDATE:");
      console.error(dbError);
      throw new Error(`DB Update Error: ${dbError.message}`);
    }
  }

  // ==========================================
  // 🪄 THE MAGIC GETTER (For Frontend List)
  // ==========================================

  // 5. Get All Sleeves Grouped (Frontend ki marzi ka format)
  async getAllSleevesGrouped() {
    // Prisma yahan automatically Dono tables ko JOIN kar dega
    const categories = await prisma.sleeveCategory.findMany({
      include: {
        options: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Frontend ke exact JSON format mein map karna
    return categories.map(cat => ({
      dbId: cat.categoryId, // UUID for updating/reordering category
      id: cat.frontendId,
      name: cat.name,
      image: cat.image,
      options: cat.options.map(opt => ({
        dbId: opt.optionId,
        id: opt.frontendId,
        name: opt.name,
        hasButtons: opt.hasButtons,
        images: opt.images,
        keywords: opt.keywords,
        tags: opt.tags,
        layers: opt.layers,
        premium: opt.isPremium,
        premium_price: opt.premiumPrice
      }))
    }));
  }
}

module.exports = new SleeveService();