const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NecklineService {
  
  // ==========================================
  // 📁 CATEGORY METHODS (Parent)
  // ==========================================

  // 1. Create a new Category
  async createCategory(data) {
    return await prisma.necklineCategory.create({
      data: {
        frontendId: data.frontendId || `nk-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        family: data.family, // 👈 Nayi family field
        image: data.image || [] 
      }
    });
  }

  // 2. Get All Categories (Dropdown ke liye)
  async getAllCategories() {
    return await prisma.necklineCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // 3. Update a Category
  async updateCategory(categoryId, updateData) {
    const dataToUpdate = {};
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.family !== undefined) dataToUpdate.family = updateData.family;
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;

    return await prisma.necklineCategory.update({
      where: { categoryId: categoryId },
      data: dataToUpdate
    });
  }

  // ==========================================
  // 👕 OPTION METHODS (Child)
  // ==========================================

  async createOption(data) {
    try {
      console.log("⚙️ [SERVICE] Attempting to create in DB...");
      const result = await prisma.necklineOption.create({
        data: {
          categoryId: data.categoryId, 
          frontendId: data.frontendId || null,
          name: data.name,
          hasButtons: data.hasButtons || false,
          isButton: data.isButton || false,
          thread: data.thread || false,
          collarback: data.collarback || false,
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
      console.error("🔥 DATABASE ERROR IN CREATE:");
      console.error(dbError);
      throw new Error(`DB Create Error: ${dbError.message}`);
    }
  }
  
  async updateOption(optionId, updateData) {
    try {
      console.log(`⚙️ [SERVICE] Formatting update data for DB...`);
      const dataToUpdate = {};
      
      if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      
      if (updateData.hasButtons !== undefined) dataToUpdate.hasButtons = updateData.hasButtons;
      if (updateData.isButton !== undefined) dataToUpdate.isButton = updateData.isButton;
      if (updateData.thread !== undefined) dataToUpdate.thread = updateData.thread;
      if (updateData.collarback !== undefined) dataToUpdate.collarback = updateData.collarback;
      
      if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
      if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
      if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
      if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
      
      if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
      if (updateData.premium_price !== undefined) {
        dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
      }

      console.log(`⚙️ [SERVICE] Attempting to update DB...`);
      const result = await prisma.necklineOption.update({
        where: { optionId: optionId },
        data: dataToUpdate
      });
      
      console.log("⚙️ [SERVICE] DB Update Successful!");
      return result;
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN UPDATE:");
      console.error(dbError);
      throw new Error(`DB Update Error: ${dbError.message}`);
    }
  }
  // 4. Create a new Option
  // async createOption(data) {
  //   return await prisma.necklineOption.create({
  //     data: {
  //       categoryId: data.categoryId, 
  //       frontendId: data.frontendId || null,
  //       name: data.name,
        
  //       // Neckline specific toggles
  //       hasButtons: data.hasButtons || false,
  //       isButton: data.isButton || false,
  //       thread: data.thread || false,
  //       collarback: data.collarback || false,
        
  //       images: data.images || [], 
  //       keywords: data.keywords || [],
  //       tags: data.tags || [],
        
  //       // 🚀 Ab is layers array ke andar aapke Cloudinary ke SVG URLs bhi save honge
  //       layers: data.layers || [], 
        
  //       isPremium: data.premium || false, 
  //       premiumPrice: data.premiumPrice ? parseFloat(data.premiumPrice) : null
  //     }
  //   });
  // }
  

  // async updateOption(optionId, updateData) {
  //   const dataToUpdate = {};
    
  //   // Basic text fields
  //   if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
  //   if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    
  //   // Toggles update
  //   if (updateData.hasButtons !== undefined) dataToUpdate.hasButtons = updateData.hasButtons;
  //   if (updateData.isButton !== undefined) dataToUpdate.isButton = updateData.isButton;
  //   if (updateData.thread !== undefined) dataToUpdate.thread = updateData.thread;
  //   if (updateData.collarback !== undefined) dataToUpdate.collarback = updateData.collarback;
    
  //   // Arrays and JSON updates
  //   if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
  //   if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
  //   if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
    
  //   // 🚀 Layers update (Isme updated Cloudinary URLs shamil honge)
  //   if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
    
  //   // Premium fields
  //   if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
  //   if (updateData.premium_price !== undefined) {
  //     dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
  //   }

  //   return await prisma.necklineOption.update({
  //     where: { optionId: optionId },
  //     data: dataToUpdate
  //   });
  // }

  // ==========================================
  // 🪄 THE MAGIC GETTER (For Frontend List)
  // ==========================================

  // 6. Get All Necklines Grouped
  async getAllNecklinesGrouped() {
    const categories = await prisma.necklineCategory.findMany({
      include: {
        options: true // Child data sath laye
      },
      orderBy: { createdAt: 'desc' }
    });

    // Frontend ke JSON format mein map karna
    return categories.map(cat => ({
      dbId: cat.categoryId,
      id: cat.frontendId,
      name: cat.name,
      family: cat.family,
      image: cat.image,
      options: cat.options.map(opt => ({
        dbId: opt.optionId,
        id: opt.frontendId,
        name: opt.name,
        
        // Neckline toggles
        hasButtons: opt.hasButtons,
        isButton: opt.isButton,
        thread: opt.thread,
        collarback: opt.collarback,
        
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

module.exports = new NecklineService();